// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@erc3643org/erc-3643/contracts/token/Token.sol";
import "@erc3643org/erc-3643/contracts/registry/implementation/IdentityRegistry.sol";
import "@erc3643org/erc-3643/contracts/registry/implementation/IdentityRegistryStorage.sol";
import "@erc3643org/erc-3643/contracts/registry/implementation/ClaimTopicsRegistry.sol";
import "@erc3643org/erc-3643/contracts/registry/implementation/TrustedIssuersRegistry.sol";
import "@erc3643org/erc-3643/contracts/compliance/modular/ModularCompliance.sol";

import "@erc3643org/erc-3643/contracts/token/IToken.sol";
import "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistry.sol";
import "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistryStorage.sol";
import "@erc3643org/erc-3643/contracts/registry/interface/IClaimTopicsRegistry.sol";
import "@erc3643org/erc-3643/contracts/registry/interface/ITrustedIssuersRegistry.sol";
import "@erc3643org/erc-3643/contracts/compliance/modular/IModularCompliance.sol";
import "@onchain-id/solidity/contracts/interface/IIdentity.sol";

contract TaskBoard {
    // --- State Variables ---
    address public deployer;

    IToken public token;
    IIdentityRegistry public identityRegistry;
    IIdentityRegistryStorage public identityRegistryStorage;
    IClaimTopicsRegistry public claimTopicsRegistry;
    ITrustedIssuersRegistry public trustedIssuersRegistry;
    IModularCompliance public compliance;

    // --- Constants ---
    uint256 public constant DEFAULT_TIMEOUT = 300;
    uint256 public constant BASE_FEE = 10**18;

    // --- Enums and Structs ---
    enum TaskStatus {
        Open,
        Evaluating,
        Settled,
        Cancelled
    }

    struct Task {
        address publisher;
        uint256 rewardAmount;
        uint256 deadline;
        TaskStatus status;
        address[] submissions;
        address[] approvedSubmitters;
    }

    struct Submission {
        string workCid;
        address submitter;
        bool isApproved;
    }

    // Storage
    string[] public allTaskIds;
    mapping(string => Task) public tasks; // taskId => Task
    mapping(string => mapping(address => string)) public taskSubmissions; // taskId => submitter => workCid
    mapping(string => mapping(address => bool)) public hasSubmitted; // taskId => submitter => bool

    // --- Events ---
    event TaskCreated(string taskId, address indexed publisher, uint256 rewardAmount, uint256 deadline);
    event TaskExtended(string taskId, address indexed publisher, uint256 newRewardAmount, uint256 newDeadline);
    event TaskCancelled(string taskId, address indexed publisher);
    event WorkSubmitted(string taskId, address indexed submitter, string workCid);
    event WorkApproved(string taskId, address[] winners);
    event TaskSettled(string taskId, uint256 totalReward, uint256 totalWinners);
    event EthWrapped(address indexed user, uint256 amount);
    event EthUnwrapped(address indexed user, uint256 amount);

    // --- Modifiers ---
    modifier onlyDeployer() {
        require(msg.sender == deployer, "Not the deployer");
        _;
    }

    modifier onlyVerified(address user) {
        require(identityRegistry.isVerified(user), "User is not verified in the registry");
        _;
    }

    constructor() {
        deployer = msg.sender;
        
        // 1. Deploy & Init IdentityRegistryStorage
        IdentityRegistryStorage irs = new IdentityRegistryStorage();
        irs.init();

        // 2. Deploy & Init ClaimTopicsRegistry
        ClaimTopicsRegistry ctr = new ClaimTopicsRegistry();
        ctr.init();

        // 3. Deploy & Init TrustedIssuersRegistry
        TrustedIssuersRegistry tir = new TrustedIssuersRegistry();
        tir.init();

        // 4. Deploy & Init IdentityRegistry
        IdentityRegistry ir = new IdentityRegistry();
        ir.init(address(tir), address(ctr), address(irs));

        // 5. Deploy & Init ModularCompliance
        ModularCompliance mc = new ModularCompliance();
        mc.init();

        // 6. Deploy & Init Token
        Token t = new Token();
        t.init(address(ir), address(mc), "Wrapped iSunCoin", "wISC", 18, address(0));

        // 7. Bind dependencies
        irs.bindIdentityRegistry(address(ir));

        // 8. Grant Agents
        ir.addAgent(deployer);
        ir.addAgent(address(this));
        
        t.addAgent(deployer);
        t.addAgent(address(this));

        // 9. Assign pointers
        token = IToken(address(t));
        identityRegistry = IIdentityRegistry(address(ir));
        identityRegistryStorage = IIdentityRegistryStorage(address(irs));
        claimTopicsRegistry = IClaimTopicsRegistry(address(ctr));
        trustedIssuersRegistry = ITrustedIssuersRegistry(address(tir));
        compliance = IModularCompliance(address(mc));

        // 10. Transfer Ownerships to Deployer
        irs.transferOwnership(deployer);
        ctr.transferOwnership(deployer);
        tir.transferOwnership(deployer);
        ir.transferOwnership(deployer);
        mc.transferOwnership(deployer);
        t.transferOwnership(deployer);
    }

    // --- Identity Management ---
    function addWhitelist(address _user, address _identity, uint16 _country) external onlyDeployer {
        identityRegistry.registerIdentity(_user, IIdentity(_identity), _country);
    }

    // --- Token Wrapping Mechanism (WETH10 Mode) ---

    // Deposit ISC to mint Wrapped Tokens 1:1
    function deposit() external payable onlyVerified(msg.sender) {
        require(msg.value > 0, "Deposit amount must be > 0");
        
        // Mint compliance tokens equal to msg.value
        token.mint(msg.sender, msg.value);

        emit EthWrapped(msg.sender, msg.value);
    }

    // Withdraw Wrapped Tokens to receive ISC 1:1
    function withdraw(uint256 amount) external onlyVerified(msg.sender) {
        require(amount > 0, "Withdraw amount must be > 0");
        require(token.balanceOf(msg.sender) >= amount, "Insufficient token balance");

        // Burn tokens
        token.burn(msg.sender, amount);

        // Transfer raw ISC to user
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ISC Transfer failed");

        emit EthUnwrapped(msg.sender, amount);
    }

    // --- Task Core Functionalities ---

    function createTask(string memory _cid) external onlyVerified(msg.sender) {
        require(tasks[_cid].publisher == address(0), "Task with this CID already exists");

        // Transfer reward tokens from user to this contract (Escrow)
        require(token.transferFrom(msg.sender, address(this), BASE_FEE), "Token escrow failed");

        tasks[_cid].publisher = msg.sender;
        tasks[_cid].rewardAmount = BASE_FEE;
        tasks[_cid].deadline = block.timestamp + DEFAULT_TIMEOUT;
        tasks[_cid].status = TaskStatus.Open;
        
        allTaskIds.push(_cid);

        emit TaskCreated(_cid, msg.sender, BASE_FEE, tasks[_cid].deadline);
    }

    function extendTask(string memory _taskId) external {
        Task storage taskInst = tasks[_taskId];
        require(taskInst.publisher == msg.sender, "Not publisher");
        require(taskInst.status == TaskStatus.Open, "Task is not open");
        
        require(token.transferFrom(msg.sender, address(this), BASE_FEE), "Token escrow failed");
        
        taskInst.deadline += DEFAULT_TIMEOUT;
        taskInst.rewardAmount += BASE_FEE;
        
        emit TaskExtended(_taskId, msg.sender, taskInst.rewardAmount, taskInst.deadline);
    }

    function cancelTask(string memory _taskId) external {
        Task storage taskInst = tasks[_taskId];
        require(taskInst.publisher == msg.sender, "Not publisher");
        require(taskInst.status == TaskStatus.Open, "Task is not open");
        require(block.timestamp > taskInst.deadline, "Task deadline has not passed");
        
        taskInst.status = TaskStatus.Cancelled;
        uint256 refundAmount = taskInst.rewardAmount;
        taskInst.rewardAmount = 0;
        
        require(token.transfer(msg.sender, refundAmount), "Refund failed");
        
        emit TaskCancelled(_taskId, msg.sender);
    }

    function listTask() external view returns (string[] memory) {
        return allTaskIds;
    }

    function submitWork(string memory _taskId, string memory _workCid) external onlyVerified(msg.sender) {
        Task storage taskInst = tasks[_taskId];
        require(taskInst.publisher != address(0), "Task does not exist");
        require(taskInst.status == TaskStatus.Open, "Task is not open");
        require(block.timestamp <= taskInst.deadline, "Task deadline has passed");
        require(!hasSubmitted[_taskId][msg.sender], "Already submitted once");

        taskInst.submissions.push(msg.sender);
        taskSubmissions[_taskId][msg.sender] = _workCid;
        hasSubmitted[_taskId][msg.sender] = true;

        emit WorkSubmitted(_taskId, msg.sender, _workCid);
    }

    function approveWork(string memory _taskId, address[] memory _winners) external {
        Task storage taskInst = tasks[_taskId];
        require(taskInst.publisher == msg.sender, "Only publisher can approve");
        require(taskInst.status == TaskStatus.Open, "Task is not open");
        
        for (uint i = 0; i < _winners.length; i++) {
            require(hasSubmitted[_taskId][_winners[i]], "Winner must have submitted work");
            taskInst.approvedSubmitters.push(_winners[i]);
        }
        
        taskInst.status = TaskStatus.Evaluating;
        
        emit WorkApproved(_taskId, _winners);
    }

    function settlement(string memory _taskId) external {
        Task storage taskInst = tasks[_taskId];
        require(taskInst.publisher != address(0), "Task does not exist");
        require(taskInst.status == TaskStatus.Evaluating || taskInst.status == TaskStatus.Open, "Task already settled");
        // We allow settlement if it's open but past deadline
        if (taskInst.status == TaskStatus.Open) {
            require(block.timestamp > taskInst.deadline, "Deadline has not passed yet");
        }

        uint256 totalReward = taskInst.rewardAmount;
        address publisher = taskInst.publisher;
        uint256 winnersCount = taskInst.approvedSubmitters.length;

        taskInst.status = TaskStatus.Settled;
        taskInst.rewardAmount = 0; // Prevent re-entrancy logic issue

        if (winnersCount == 0) {
            // Refund full amount to publisher
            require(token.transfer(publisher, totalReward), "Refund failed");
            emit TaskSettled(_taskId, 0, 0);
        } else {
            uint256 amountPerWinner = totalReward / winnersCount;
            uint256 dust = totalReward % winnersCount;

            for (uint i = 0; i < winnersCount; i++) {
                require(token.transfer(taskInst.approvedSubmitters[i], amountPerWinner), "Transfer to winner failed");
            }

            if (dust > 0) {
                require(token.transfer(publisher, dust), "Dust refund failed");
            }

            emit TaskSettled(_taskId, totalReward, winnersCount);
        }
    }
}
