// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {
    ERC721URIStorage
} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IDynamicKYCMembership {
    function isBlacklisted(address user) external view returns (bool);
}

/**
 * Info: (20260418 - Luphia)
 * @title MissionBoard
 * @dev Web3 Bounty Board with Escrow, NFT tracking, Dispute resolution, and Blacklist governance.
 */
contract MissionBoard is ERC721URIStorage, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Info: (20260418 - Luphia) Enums & Structs
    enum TaskStatus {
        Open,
        PendingReview,
        Disputed,
        Closed
    }
    enum ReportStatus {
        Pending,
        Approved,
        Dismissed
    }

    struct Task {
        address creator;
        string contentCid;
        uint256 reward;
        uint256 createdAt;
        uint256 updatedAt;
        TaskStatus status;
        uint256 submissionCount;
    }

    struct Submission {
        address submitter;
        string resultCid;
        bool isRejected;
        uint256 disputeUntil;
    }

    struct Report {
        uint256 taskId;
        address reporter;
        address reportedUser;
        string reasonCid;
        ReportStatus status;
    }

    // Info: (20260418 - Luphia) State Variables
    IERC20 public rewardToken;
    IDynamicKYCMembership public kycMembership;
    uint256 public minReward;

    uint256 private _nextTaskId;
    uint256 private _nextReportId;

    mapping(uint256 => Task) public tasks;
    mapping(uint256 => mapping(uint256 => Submission)) public taskSubmissions;
    mapping(uint256 => Report) public reports;

    uint256 public constant DISPUTE_PERIOD = 3 days;

    // Info: (20260418 - Luphia) Events
    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        uint256 reward,
        string contentCid
    );
    event TaskBumped(
        uint256 indexed taskId,
        uint256 addedReward,
        uint256 newUpdatedAt
    );
    event ResultSubmitted(
        uint256 indexed taskId,
        address indexed submitter,
        uint256 submissionIndex,
        string resultCid
    );
    event SubmissionApproved(
        uint256 indexed taskId,
        address indexed submitter,
        uint256 reward
    );
    event SubmissionRejected(
        uint256 indexed taskId,
        uint256 submissionIndex,
        uint256 disputeUntil
    );
    event TaskCanceled(uint256 indexed taskId, uint256 refundedAmount);
    event DisputeRaised(uint256 indexed taskId, uint256 submissionIndex);
    event DisputeResolved(uint256 indexed taskId, bool paidToSubmitter);
    event ReportFiled(
        uint256 indexed reportId,
        address indexed reporter,
        address indexed reportedUser
    );
    // Info: (20260418 - Luphia) 解耦設計：此事件將交由後端擷取後，呼叫全局黑名單 API
    event ReportResolved(
        uint256 indexed reportId,
        bool isApproved,
        address reportedUser
    );

    // Info: (20260418 - Luphia) Modifiers
    modifier onlyNotBlacklisted() {
        require(
            !kycMembership.isBlacklisted(msg.sender),
            "MissionBoard: User is blacklisted"
        );
        _;
    }

    modifier onlyTaskCreator(uint256 taskId) {
        require(
            tasks[taskId].creator == msg.sender,
            "MissionBoard: Not task creator"
        );
        _;
    }

    // Info: (20260418 - Luphia) Constructor & Admin Functions
    constructor(
        address _rewardToken,
        address _kycMembership,
        uint256 _minReward,
        address defaultAdmin
    ) ERC721("MissionBoard NFT", "MBNFT") {
        rewardToken = IERC20(_rewardToken);
        kycMembership = IDynamicKYCMembership(_kycMembership);
        minReward = _minReward;
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    function setMinReward(
        uint256 _newMinReward
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minReward = _newMinReward;
    }

    function setKYCMembership(
        address _kycMembership
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        kycMembership = IDynamicKYCMembership(_kycMembership);
    }

    /**
     * Info: (20260418 - Luphia) Overrides supportsInterface for correct 165 resolution
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Info: (20260418 - Luphia) Task Lifecycle Functions (Write)
    function createTask(
        string calldata cid,
        uint256 initialReward
    ) external nonReentrant onlyNotBlacklisted returns (uint256) {
        require(
            initialReward >= minReward,
            "MissionBoard: Reward below minimum"
        );

        rewardToken.safeTransferFrom(msg.sender, address(this), initialReward);

        uint256 taskId = _nextTaskId++;

        tasks[taskId] = Task({
            creator: msg.sender,
            contentCid: cid,
            reward: initialReward,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            status: TaskStatus.Open,
            submissionCount: 0
        });

        _safeMint(msg.sender, taskId);
        // Info: (20260418 - Luphia) Append ERC721URIStorage content linking
        _setTokenURI(taskId, cid);

        emit TaskCreated(taskId, msg.sender, initialReward, cid);
        return taskId;
    }

    function bumpTask(
        uint256 taskId
    ) external nonReentrant onlyNotBlacklisted onlyTaskCreator(taskId) {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.Open,
            "MissionBoard: Task is not open"
        );

        uint256 bumpAmount = task.reward / 10;
        require(bumpAmount > 0, "MissionBoard: Bump amount too small");

        rewardToken.safeTransferFrom(msg.sender, address(this), bumpAmount);

        task.reward += bumpAmount;
        task.updatedAt = block.timestamp;

        emit TaskBumped(taskId, bumpAmount, task.updatedAt);
    }

    function submitResult(
        uint256 taskId,
        string calldata resultCid
    ) external onlyNotBlacklisted {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.Open ||
                task.status == TaskStatus.PendingReview,
            "MissionBoard: Cannot submit"
        );

        uint256 subIndex = task.submissionCount++;
        taskSubmissions[taskId][subIndex] = Submission({
            submitter: msg.sender,
            resultCid: resultCid,
            isRejected: false,
            disputeUntil: 0
        });

        task.status = TaskStatus.PendingReview;
        emit ResultSubmitted(taskId, msg.sender, subIndex, resultCid);
    }

    function rejectSubmission(
        uint256 taskId,
        uint256 subIndex
    ) external onlyNotBlacklisted onlyTaskCreator(taskId) {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.PendingReview,
            "MissionBoard: Invalid task status"
        );

        Submission storage sub = taskSubmissions[taskId][subIndex];
        require(!sub.isRejected, "MissionBoard: Already rejected");

        sub.isRejected = true;
        sub.disputeUntil = block.timestamp + DISPUTE_PERIOD;

        emit SubmissionRejected(taskId, subIndex, sub.disputeUntil);
    }

    function approveSubmission(
        uint256 taskId,
        uint256 subIndex
    ) external nonReentrant onlyTaskCreator(taskId) {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.PendingReview ||
                task.status == TaskStatus.Disputed,
            "MissionBoard: Invalid status"
        );

        Submission storage sub = taskSubmissions[taskId][subIndex];
        require(!sub.isRejected, "MissionBoard: Submission was rejected");

        task.status = TaskStatus.Closed;

        // Info: (20260418 - Luphia) Transfer reward to submitter
        rewardToken.safeTransfer(sub.submitter, task.reward);
        emit SubmissionApproved(taskId, sub.submitter, task.reward);
    }

    function cancelTask(
        uint256 taskId
    ) external nonReentrant onlyTaskCreator(taskId) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "MissionBoard: Not Open");
        require(
            task.submissionCount == 0,
            "MissionBoard: Has submissions, cannot cancel"
        );

        task.status = TaskStatus.Closed;

        rewardToken.safeTransfer(msg.sender, task.reward);
        emit TaskCanceled(taskId, task.reward);
    }

    // Info: (20260418 - Luphia) Dispute & Arbitration Functions
    function raiseDispute(uint256 taskId, uint256 subIndex) external {
        Task storage task = tasks[taskId];
        Submission storage sub = taskSubmissions[taskId][subIndex];

        require(msg.sender == sub.submitter, "MissionBoard: Not submitter");
        require(sub.isRejected, "MissionBoard: Not rejected yet");
        require(
            block.timestamp <= sub.disputeUntil,
            "MissionBoard: Dispute period ended"
        );

        task.status = TaskStatus.Disputed;
        emit DisputeRaised(taskId, subIndex);
    }

    function resolveDispute(
        uint256 taskId,
        uint256 subIndex,
        bool payToSubmitter
    ) external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.Disputed,
            "MissionBoard: Task not in dispute"
        );

        task.status = TaskStatus.Closed;

        if (payToSubmitter) {
            address submitter = taskSubmissions[taskId][subIndex].submitter;
            rewardToken.safeTransfer(submitter, task.reward);
        } else {
            rewardToken.safeTransfer(task.creator, task.reward);
        }

        emit DisputeResolved(taskId, payToSubmitter);
    }

    // Info: (20260418 - Luphia) Reporting & Blacklist Functions
    function reportTaskParticipant(
        uint256 taskId,
        address targetUser,
        string calldata reasonCid
    ) external onlyNotBlacklisted {
        uint256 reportId = _nextReportId++;

        reports[reportId] = Report({
            taskId: taskId,
            reporter: msg.sender,
            reportedUser: targetUser,
            reasonCid: reasonCid,
            status: ReportStatus.Pending
        });

        emit ReportFiled(reportId, msg.sender, targetUser);
    }

    function resolveReport(
        uint256 reportId,
        bool approveReport
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Report storage rep = reports[reportId];
        require(
            rep.status == ReportStatus.Pending,
            "MissionBoard: Report already resolved"
        );

        if (approveReport) {
            rep.status = ReportStatus.Approved;
            emit ReportResolved(reportId, true, rep.reportedUser);
        } else {
            rep.status = ReportStatus.Dismissed;
            emit ReportResolved(reportId, false, rep.reportedUser);
        }
    }
}
