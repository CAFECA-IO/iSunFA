// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fido2Account} from "../fido2_account.sol";
import {Fido2AccountV2} from "../fido2_account_v2.sol";
import {Fido2AccountAnchor} from "../fido2_account_anchor.sol";
import {Fido2AccountFactory} from "../fido2_account_factory.sol";
import {Fido2AccountFactoryV2} from "../fido2_account_factory_v2.sol";
import {DynamicKYCMembership} from "../dynamic_kyc_membership.sol";
import {
    IEntryPoint
} from "../lib/@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/**
 * Info: (20260821 - Luphia) D 方案的合約級驗證（forge test）。
 *
 * 這一組把整條升級路線的**不變式**釘在鏈上語意層，而不是留在設計文件裡：
 *
 * 1. V2 錢包收得到會員卡（V1 的 `ERC721InvalidReceiver` 在此消失）
 * 2. `getAddress` 跨實作版本**恆定**——這是 factory「可升級」的定義本身；
 *    V1 factory 做不到正是因為它把實作位址編進了推導
 * 3. 既有 V1 錢包由**持有人（EntryPoint 路徑）**升級後收得到卡，且三把鑰匙原封不動
 * 4. 沒升級的 V1 錢包行為完全不變（仍收不到卡，也不受任何新部署影響）
 * 5. 劫持路徑全部鎖死：initialize 不可重跑、anchor 不可被初始化、
 *    換實作限管理者、升級限 EntryPoint
 *
 * 不用 forge-std（repo 沒有 vendor 它）：cheatcode 以最小 Vm 介面直接呼叫。
 */
interface Vm {
    function prank(address sender) external;

    function expectRevert() external;

    function load(
        address target,
        bytes32 slot
    ) external view returns (bytes32);
}

contract ScwUpgradeTest {
    Vm internal constant vm =
        Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    // Info: (20260821 - Luphia) ERC-1967 implementation slot
    bytes32 internal constant IMPL_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    // Info: (20260821 - Luphia) EntryPoint 只被拿來比對 msg.sender，dummy 位址即可
    address internal constant ENTRY_POINT = address(0xE9);
    address internal constant STRANGER = address(0xBad);

    bytes internal constant CRED = hex"c0ffee01";
    uint256 internal constant PKX = 111;
    uint256 internal constant PKY = 222;

    DynamicKYCMembership internal card;
    Fido2AccountFactory internal factoryV1;
    Fido2AccountFactoryV2 internal factoryV2;

    function setUp() public {
        card = new DynamicKYCMembership(address(this));
        factoryV1 = new Fido2AccountFactory(IEntryPoint(ENTRY_POINT));
        factoryV2 = new Fido2AccountFactoryV2(
            IEntryPoint(ENTRY_POINT),
            address(this)
        );
    }

    // ── 1) 新錢包收得到卡 ────────────────────────────────────────────

    function testMintToFactoryV2WalletSucceeds() public {
        address wallet = address(
            factoryV2.createAccount(CRED, PKX, PKY, 0, "u", "i")
        );

        uint256 tokenId = card.mintCard(wallet, "uri-1");

        require(card.ownerOf(tokenId) == wallet, "card not delivered");
        // Info: (20260821 - Luphia) 鑰匙由 anchor 寫入後必須讀得回來
        require(Fido2Account(payable(wallet)).pubKeyX() == PKX, "pubKeyX lost");
        require(Fido2Account(payable(wallet)).pubKeyY() == PKY, "pubKeyY lost");
    }

    // Info: (20260821 - Luphia) worker 的探針語意：V2 回 true
    function testV2WalletAnswersReceiverProbe() public {
        address wallet = address(
            factoryV2.createAccount(CRED, PKX, PKY, 0, "u", "i")
        );

        require(
            Fido2AccountV2(payable(wallet)).supportsInterface(0x150b7a02),
            "probe should be true"
        );
    }

    // ── 2) 位址跨版本恆定 ────────────────────────────────────────────

    function testAddressStableAcrossImplementationBump() public {
        address before = factoryV2.getAddress(CRED, PKX, PKY, 0);

        address newImpl = address(new Fido2AccountV2(IEntryPoint(ENTRY_POINT)));
        factoryV2.setAccountImplementation(newImpl);

        require(
            factoryV2.getAddress(CRED, PKX, PKY, 0) == before,
            "address must not change with implementation"
        );

        // Info: (20260821 - Luphia) 部署落在同一個位址，且實作是**換過之後**的那一版
        address wallet = address(
            factoryV2.createAccount(CRED, PKX, PKY, 0, "u", "i")
        );
        require(wallet == before, "deployed at a different address");
        require(
            address(uint160(uint256(vm.load(wallet, IMPL_SLOT)))) == newImpl,
            "new wallet should run the bumped implementation"
        );
    }

    // Info: (20260821 - Luphia) V1 factory 的反例：它的推導綁實作，因此天生不可升級。
    // 這條釘住「為什麼需要 V2 factory」的事實本身——V1 兩個 factory 實例
    // （= 兩個不同 implementation 位址）對同一組 credential 推出不同位址。
    function testV1DerivationDependsOnImplementation() public {
        Fido2AccountFactory another = new Fido2AccountFactory(
            IEntryPoint(ENTRY_POINT)
        );

        require(
            factoryV1.getAddress(CRED, PKX, PKY, 0) !=
                another.getAddress(CRED, PKX, PKY, 0),
            "v1 derivation unexpectedly implementation-independent"
        );
    }

    // ── 3) 既有 V1 錢包：升級前收不到、升級後收得到、鑰匙不動 ──────────

    function testV1WalletUpgradePath() public {
        address wallet = address(
            factoryV1.createAccount(CRED, PKX, PKY, 0, "u", "i")
        );

        // Info: (20260821 - Luphia) 升級前：正是生產環境實測到的 ERC721InvalidReceiver
        vm.expectRevert();
        card.mintCard(wallet, "uri-1");

        // Info: (20260821 - Luphia) 持有人簽出的 UserOp 由 EntryPoint 執行升級
        address v2Impl = address(new Fido2AccountV2(IEntryPoint(ENTRY_POINT)));
        vm.prank(ENTRY_POINT);
        Fido2AccountV2(payable(wallet)).upgradeToAndCall(v2Impl, "");

        uint256 tokenId = card.mintCard(wallet, "uri-1");
        require(card.ownerOf(tokenId) == wallet, "card not delivered");
        require(
            Fido2Account(payable(wallet)).pubKeyX() == PKX,
            "keys must survive the upgrade"
        );
        require(
            keccak256(Fido2Account(payable(wallet)).credentialId()) ==
                keccak256(CRED),
            "credentialId must survive the upgrade"
        );
    }

    // ── 4) 沒升級的 V1 錢包完全不受影響 ─────────────────────────────

    function testUntouchedV1WalletKeepsOldImplementation() public {
        address wallet = address(
            factoryV1.createAccount(CRED, PKX, PKY, 0, "u", "i")
        );
        bytes32 implBefore = vm.load(wallet, IMPL_SLOT);

        // Info: (20260821 - Luphia) 全套新部署 + 換版都發生了
        Fido2AccountFactoryV2 f2 = new Fido2AccountFactoryV2(
            IEntryPoint(ENTRY_POINT),
            address(this)
        );
        f2.setAccountImplementation(
            address(new Fido2AccountV2(IEntryPoint(ENTRY_POINT)))
        );
        f2.createAccount(hex"beef", 1, 2, 0, "u", "i");

        require(
            vm.load(wallet, IMPL_SLOT) == implBefore,
            "v1 wallet implementation must be untouched"
        );

        // Info: (20260821 - Luphia) 探針對 V1 錢包必須是 revert（worker 視為 false）
        (bool ok, ) = wallet.staticcall(
            abi.encodeWithSignature("supportsInterface(bytes4)", bytes4(0x150b7a02))
        );
        require(!ok, "v1 wallet should not answer the probe");
    }

    // ── 5) 劫持路徑 ────────────────────────────────────────────────

    function testInitializeCannotRerunAfterCreation() public {
        address wallet = address(
            factoryV2.createAccount(CRED, PKX, PKY, 0, "u", "i")
        );

        vm.expectRevert();
        Fido2Account(payable(wallet)).initialize(hex"dead", 9, 9);
    }

    function testAnchorItselfCannotBeInitialized() public {
        Fido2AccountAnchor anchor = factoryV2.accountAnchor();

        vm.expectRevert();
        anchor.initialize(hex"dead", 9, 9);
    }

    function testSetImplementationRequiresAdmin() public {
        address impl = address(new Fido2AccountV2(IEntryPoint(ENTRY_POINT)));

        vm.prank(STRANGER);
        vm.expectRevert();
        factoryV2.setAccountImplementation(impl);
    }

    function testSetImplementationRejectsNonContract() public {
        vm.expectRevert();
        factoryV2.setAccountImplementation(STRANGER);
    }

    function testUpgradeRequiresEntryPoint() public {
        address wallet = address(
            factoryV2.createAccount(CRED, PKX, PKY, 0, "u", "i")
        );
        address impl = address(new Fido2AccountV2(IEntryPoint(ENTRY_POINT)));

        // Info: (20260821 - Luphia) 平台（或任何非 EntryPoint）不能替錢包換邏輯
        vm.expectRevert();
        Fido2AccountV2(payable(wallet)).upgradeToAndCall(impl, "");
    }

    // ── 冪等 ───────────────────────────────────────────────────────

    function testCreateAccountIsIdempotent() public {
        address first = address(
            factoryV2.createAccount(CRED, PKX, PKY, 0, "u", "i")
        );
        address second = address(
            factoryV2.createAccount(CRED, PKX, PKY, 0, "u", "i")
        );

        require(first == second, "createAccount must be idempotent");
        require(
            factoryV2.getAccountByCredentialId(CRED) == first,
            "credential lookup broken"
        );
    }
}
