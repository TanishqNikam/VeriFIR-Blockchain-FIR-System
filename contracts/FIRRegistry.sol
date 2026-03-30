// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title FIRRegistry
 * @notice Immutable on-chain registry for FIR records.
 *         Stores FIR ID, IPFS CID, SHA-256 data hash, timestamp, and registrant.
 *         Once registered, a FIR record cannot be modified or deleted.
 *         Police officers can record on-chain verifications and status updates.
 */
contract FIRRegistry {
    struct FIR {
        string firId;
        string cid;
        string dataHash;
        uint256 timestamp;
        address registeredBy;
        bool exists;
    }

    struct Verification {
        address verifiedBy;
        uint256 timestamp;
        bool exists;
    }

    struct StatusChange {
        string status;
        address updatedBy;
        uint256 timestamp;
    }

    // firId => FIR record
    mapping(string => FIR) private firs;

    // firId => Verification record
    mapping(string => Verification) private verifications;

    // firId => status history (append-only)
    mapping(string => StatusChange[]) private statusHistory;

    // Total count of registered FIRs
    uint256 public firCount;

    event FIRCreated(
        string indexed firId,
        string cid,
        string dataHash,
        uint256 timestamp,
        address indexed registeredBy
    );

    event FIRVerified(
        string indexed firId,
        address indexed verifiedBy,
        uint256 timestamp
    );

    event StatusUpdated(
        string indexed firId,
        string status,
        address indexed updatedBy,
        uint256 timestamp
    );

    /**
     * @notice Register a new FIR on the blockchain.
     */
    function registerFIR(
        string calldata firId,
        string calldata cid,
        string calldata dataHash
    ) external {
        require(!firs[firId].exists, "FIRRegistry: FIR already registered");
        require(bytes(firId).length > 0, "FIRRegistry: firId cannot be empty");
        require(bytes(cid).length > 0, "FIRRegistry: CID cannot be empty");
        require(bytes(dataHash).length == 64, "FIRRegistry: dataHash must be a 64-char hex SHA-256");

        firs[firId] = FIR({
            firId: firId,
            cid: cid,
            dataHash: dataHash,
            timestamp: block.timestamp,
            registeredBy: msg.sender,
            exists: true
        });

        firCount += 1;

        // Record initial status
        statusHistory[firId].push(StatusChange("pending", msg.sender, block.timestamp));

        emit FIRCreated(firId, cid, dataHash, block.timestamp, msg.sender);
        emit StatusUpdated(firId, "pending", msg.sender, block.timestamp);
    }

    /**
     * @notice Record a police officer's verification of an FIR on-chain.
     */
    function verifyFIR(string calldata firId) external {
        require(firs[firId].exists, "FIRRegistry: FIR not registered");
        require(!verifications[firId].exists, "FIRRegistry: FIR already verified on-chain");

        verifications[firId] = Verification({
            verifiedBy: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        statusHistory[firId].push(StatusChange("verified", msg.sender, block.timestamp));

        emit FIRVerified(firId, msg.sender, block.timestamp);
        emit StatusUpdated(firId, "verified", msg.sender, block.timestamp);
    }

    /**
     * @notice Record a status update on-chain (under-verification, rejected, etc.)
     */
    function updateStatus(string calldata firId, string calldata status) external {
        require(firs[firId].exists, "FIRRegistry: FIR not registered");
        require(bytes(status).length > 0, "FIRRegistry: status cannot be empty");

        statusHistory[firId].push(StatusChange(status, msg.sender, block.timestamp));

        emit StatusUpdated(firId, status, msg.sender, block.timestamp);
    }

    /**
     * @notice Get the number of status history entries for an FIR.
     */
    function getStatusHistoryCount(string calldata firId) external view returns (uint256) {
        return statusHistory[firId].length;
    }

    /**
     * @notice Get a status history entry by index.
     */
    function getStatusHistory(string calldata firId, uint256 index)
        external
        view
        returns (string memory status_, address updatedBy_, uint256 timestamp_)
    {
        require(index < statusHistory[firId].length, "FIRRegistry: index out of bounds");
        StatusChange storage sc = statusHistory[firId][index];
        return (sc.status, sc.updatedBy, sc.timestamp);
    }

    /**
     * @notice Retrieve a registered FIR by its ID.
     */
    function getFIR(string calldata firId)
        external
        view
        returns (
            string memory firId_,
            string memory cid_,
            string memory dataHash_,
            uint256 timestamp_,
            address registeredBy_
        )
    {
        require(firs[firId].exists, "FIRRegistry: FIR not found");
        FIR storage fir = firs[firId];
        return (fir.firId, fir.cid, fir.dataHash, fir.timestamp, fir.registeredBy);
    }

    /**
     * @notice Get the on-chain verification record for an FIR.
     */
    function getVerification(string calldata firId)
        external
        view
        returns (
            address verifiedBy_,
            uint256 timestamp_,
            bool exists_
        )
    {
        Verification storage v = verifications[firId];
        return (v.verifiedBy, v.timestamp, v.exists);
    }

    /**
     * @notice Check whether a FIR has been registered.
     */
    function isFIRRegistered(string calldata firId) external view returns (bool) {
        return firs[firId].exists;
    }
}
