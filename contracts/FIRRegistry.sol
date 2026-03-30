// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title  FIRRegistry
 * @notice Tamper-proof on-chain registry for First Information Reports (FIRs).
 *
 * @dev    Deployed on Ethereum Sepolia Testnet.
 *         Contract Address : 0x53046e2946164fa77232d7A71f52dA50E7db8F8d
 *         Explorer         : https://sepolia.etherscan.io/address/0x53046e2946164fa77232d7A71f52dA50E7db8F8d
 *
 * ── How it fits into VeriFIR ────────────────────────────────────────────────
 *
 *  1. CITIZEN files an FIR through the web app.
 *     • The FIR document (JSON) is uploaded to IPFS via Pinata.
 *     • A SHA-256 hash of the document is computed.
 *     • registerFIR() is called → stores the IPFS CID + hash on-chain forever.
 *
 *  2. POLICE OFFICER reviews the FIR.
 *     • updateStatus() is called as the FIR moves through stages
 *       (pending → under-verification → verified / rejected).
 *     • verifyFIR() is called upon final approval → records the verifying
 *       officer's wallet address and timestamp permanently.
 *
 *  3. ANYONE can verify a FIR's integrity.
 *     • getFIR() returns the on-chain CID and hash.
 *     • The caller re-downloads the document from IPFS and recomputes its hash.
 *     • If hashes match → document is untampered. If not → tampered.
 *
 * ── Access Control ──────────────────────────────────────────────────────────
 *
 *  • owner            : Deployer wallet. Can authorize / revoke callers and
 *                       transfer ownership.
 *  • authorizedCallers: Whitelisted addresses (the VeriFIR backend server
 *                       wallet) that are allowed to write FIR data on-chain.
 *                       Read functions are open to everyone.
 *
 * ── Data stored on-chain (permanent, immutable) ─────────────────────────────
 *
 *  For every FIR:
 *    • firId      — unique identifier (e.g. "FIR-2024-abc123")
 *    • cid        — IPFS Content Identifier of the encrypted FIR document
 *    • dataHash   — SHA-256 hex hash of the FIR JSON (integrity anchor)
 *    • timestamp  — Unix timestamp of when the FIR was registered on-chain
 *    • registeredBy — wallet address of the backend that submitted the tx
 *
 *  Per status change:
 *    • status     — "pending", "under-verification", "verified", "rejected"
 *    • updatedBy  — wallet address that triggered the update
 *    • timestamp  — when the update occurred
 *
 *  Per verification:
 *    • verifiedBy — wallet address of the police officer who verified
 *    • timestamp  — when verification occurred
 */
contract FIRRegistry {

    // ── State Variables ──────────────────────────────────────────────────────

    /// @notice Owner of the contract (deployer). Only owner can authorize callers.
    address public owner;

    /// @notice Total number of FIRs registered on-chain.
    uint256 public firCount;

    /// @notice Whitelisted addresses allowed to write data (VeriFIR backend wallet).
    mapping(address => bool) public authorizedCallers;

    // ── Internal Data Structures ─────────────────────────────────────────────

    struct FIRRecord {
        string  firId;
        string  cid;          // IPFS Content Identifier
        string  dataHash;     // SHA-256 hash of FIR document
        uint256 timestamp;
        address registeredBy;
        bool    exists;
    }

    struct StatusEntry {
        string  status;
        address updatedBy;
        uint256 timestamp;
    }

    struct Verification {
        address verifiedBy;
        uint256 timestamp;
        bool    exists;
    }

    /// @dev firId string → FIR record
    mapping(string => FIRRecord)    private firs;

    /// @dev firId string → ordered list of status changes
    mapping(string => StatusEntry[]) private statusHistory;

    /// @dev firId string → verification record
    mapping(string => Verification)  private verifications;

    // ── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a new FIR is anchored on-chain.
    event FIRCreated(
        string  indexed firId,
        string          cid,
        string          dataHash,
        uint256         timestamp,
        address indexed registeredBy
    );

    /// @notice Emitted when a FIR's status changes (e.g. pending → verified).
    event StatusUpdated(
        string  indexed firId,
        string          status,
        address indexed updatedBy,
        uint256         timestamp
    );

    /// @notice Emitted when a police officer finally verifies a FIR.
    event FIRVerified(
        string  indexed firId,
        address indexed verifiedBy,
        uint256         timestamp
    );

    /// @notice Emitted when a caller is granted write access.
    event CallerAuthorized(address indexed caller);

    /// @notice Emitted when a caller's write access is revoked.
    event CallerRevoked(address indexed caller);

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "FIRRegistry: caller is not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedCallers[msg.sender],
            "FIRRegistry: caller is not authorized"
        );
        _;
    }

    modifier firExists(string memory firId) {
        require(firs[firId].exists, "FIRRegistry: FIR not found");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    /**
     * @notice Deploys the registry. The deployer becomes the owner and is
     *         automatically added as an authorized caller.
     */
    constructor() {
        owner = msg.sender;
        authorizedCallers[msg.sender] = true;
        emit CallerAuthorized(msg.sender);
    }

    // ── Owner Functions ──────────────────────────────────────────────────────

    /**
     * @notice Grant write access to an address (e.g. the VeriFIR backend wallet).
     * @param  caller Address to authorize.
     */
    function authorize(address caller) external onlyOwner {
        authorizedCallers[caller] = true;
        emit CallerAuthorized(caller);
    }

    /**
     * @notice Revoke write access from an address.
     * @param  caller Address to revoke.
     */
    function revoke(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
        emit CallerRevoked(caller);
    }

    /**
     * @notice Transfer contract ownership to a new address.
     * @param  newOwner Address of the new owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "FIRRegistry: zero address");
        owner = newOwner;
    }

    // ── Write Functions (authorized callers only) ────────────────────────────

    /**
     * @notice Anchor a new FIR on the blockchain.
     *
     * @dev    Called by the VeriFIR backend immediately after a citizen
     *         submits an FIR and it has been stored on IPFS.
     *         Once registered, the record can NEVER be modified or deleted.
     *
     * @param  firId    Unique FIR identifier generated by the backend.
     * @param  cid      IPFS CID of the encrypted FIR document.
     * @param  dataHash SHA-256 hex hash of the FIR JSON for integrity checks.
     */
    function registerFIR(
        string memory firId,
        string memory cid,
        string memory dataHash
    ) external onlyAuthorized {
        require(!firs[firId].exists, "FIRRegistry: FIR already registered");
        require(bytes(firId).length > 0,    "FIRRegistry: empty firId");
        require(bytes(cid).length > 0,      "FIRRegistry: empty cid");
        require(bytes(dataHash).length > 0, "FIRRegistry: empty dataHash");

        firs[firId] = FIRRecord({
            firId:        firId,
            cid:          cid,
            dataHash:     dataHash,
            timestamp:    block.timestamp,
            registeredBy: msg.sender,
            exists:       true
        });

        firCount++;

        emit FIRCreated(firId, cid, dataHash, block.timestamp, msg.sender);
    }

    /**
     * @notice Record a status change for an existing FIR.
     *
     * @dev    Called whenever a police officer moves the FIR through stages.
     *         All historical status changes are preserved — nothing is overwritten.
     *
     * @param  firId  The FIR to update.
     * @param  status New status string (e.g. "under-verification", "verified").
     */
    function updateStatus(
        string memory firId,
        string memory status
    ) external onlyAuthorized firExists(firId) {
        require(bytes(status).length > 0, "FIRRegistry: empty status");

        statusHistory[firId].push(StatusEntry({
            status:    status,
            updatedBy: msg.sender,
            timestamp: block.timestamp
        }));

        emit StatusUpdated(firId, status, msg.sender, block.timestamp);
    }

    /**
     * @notice Mark a FIR as finally verified by a police officer.
     *
     * @dev    Records the verifying wallet address and timestamp permanently.
     *         Can only be called once per FIR.
     *
     * @param  firId The FIR being verified.
     */
    function verifyFIR(
        string memory firId
    ) external onlyAuthorized firExists(firId) {
        require(!verifications[firId].exists, "FIRRegistry: FIR already verified");

        verifications[firId] = Verification({
            verifiedBy: msg.sender,
            timestamp:  block.timestamp,
            exists:     true
        });

        emit FIRVerified(firId, msg.sender, block.timestamp);
    }

    // ── Read Functions (public — anyone can call) ────────────────────────────

    /**
     * @notice Retrieve the on-chain record of a FIR.
     * @param  firId The FIR to look up.
     * @return firId_        The FIR identifier.
     * @return cid_          IPFS CID of the FIR document.
     * @return dataHash_     SHA-256 hash for integrity verification.
     * @return timestamp_    Unix timestamp when the FIR was registered.
     * @return registeredBy_ Wallet that submitted the registration transaction.
     */
    function getFIR(string memory firId)
        external
        view
        firExists(firId)
        returns (
            string  memory firId_,
            string  memory cid_,
            string  memory dataHash_,
            uint256        timestamp_,
            address        registeredBy_
        )
    {
        FIRRecord storage r = firs[firId];
        return (r.firId, r.cid, r.dataHash, r.timestamp, r.registeredBy);
    }

    /**
     * @notice Check whether a FIR has been registered on-chain.
     * @param  firId The FIR identifier to check.
     * @return True if registered, false otherwise.
     */
    function isFIRRegistered(string memory firId) external view returns (bool) {
        return firs[firId].exists;
    }

    /**
     * @notice Retrieve a single status change entry by index.
     * @param  firId  The FIR whose history to query.
     * @param  index  Zero-based position in the history array.
     * @return status_    The status string at this position.
     * @return updatedBy_ Wallet that triggered this status change.
     * @return timestamp_ When this change occurred.
     */
    function getStatusHistory(string memory firId, uint256 index)
        external
        view
        firExists(firId)
        returns (
            string  memory status_,
            address        updatedBy_,
            uint256        timestamp_
        )
    {
        require(index < statusHistory[firId].length, "FIRRegistry: index out of bounds");
        StatusEntry storage e = statusHistory[firId][index];
        return (e.status, e.updatedBy, e.timestamp);
    }

    /**
     * @notice Get the total number of status changes recorded for a FIR.
     * @param  firId The FIR to query.
     * @return Total entries in the status history.
     */
    function getStatusHistoryCount(string memory firId)
        external
        view
        firExists(firId)
        returns (uint256)
    {
        return statusHistory[firId].length;
    }

    /**
     * @notice Retrieve the verification record for a FIR.
     * @param  firId The FIR to query.
     * @return verifiedBy_ Wallet address of the verifying police officer.
     * @return timestamp_  When the verification was recorded.
     * @return exists_     False if the FIR has not yet been verified.
     */
    function getVerification(string memory firId)
        external
        view
        firExists(firId)
        returns (
            address verifiedBy_,
            uint256 timestamp_,
            bool    exists_
        )
    {
        Verification storage v = verifications[firId];
        return (v.verifiedBy, v.timestamp, v.exists);
    }
}
