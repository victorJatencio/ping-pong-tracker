import React, { useState } from "react";
import { Button, Alert, Form, Modal } from "react-bootstrap";
import DashboardCard from "../../common/Card";

const AccountManagementCard = ({ title = "Account Management" }) => {
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDeactivateAccount = async () => {
    if (!deactivateConfirm) {
      alert("Please confirm account deactivation by checking the box");
      return;
    }

    setIsDeactivating(true);
    try {
      // TODO: Implement account deactivation logic
      alert("Account deactivation initiated");
      setShowDeactivateModal(false);
    } catch (error) {
      console.error("Error deactivating account:", error);
      alert("Failed to deactivate account. Please try again.");
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <>
      <DashboardCard title={title} variant="danger">
        <Alert variant="warning" className="mb-3 alert__text">
          <Alert.Heading>
            <i className="bi bi-exclamation-triangle me-2"></i>
            <h5>Danger Zone</h5>
          </Alert.Heading>
          <div className="alert__message">
          <p className="mb-0 small">
            Once you deactivate your account, there is no going back. Please be
            certain.
          </p>

          </div>
        </Alert>

        <div className="d-grid">
          <Button
            variant="outline-danger"
            onClick={() => setShowDeactivateModal(true)}
          >
            <i className="bi bi-trash me-2"></i>
            Deactivate Account
          </Button>
        </div>
      </DashboardCard>

      {/* Deactivate Account Modal */}
      <Modal
        show={showDeactivateModal}
        onHide={() => setShowDeactivateModal(false)}
        centered
      >
        <Modal.Header closeButton className="border-danger">
          <Modal.Title className="text-danger">Deactivate Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>Warning:</strong> This action cannot be undone. Your account
            and all associated data will be permanently removed.
          </Alert>

          <p className="mb-3">
            Are you sure you want to deactivate your account? This will:
          </p>

          <ul className="mb-3">
            <li>Permanently delete your profile</li>
            <li>Remove all your match history</li>
            <li>Delete your statistics and achievements</li>
            <li>Cancel any pending invitations</li>
          </ul>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="deactivate-confirm"
              label="I understand that this action cannot be undone"
              checked={deactivateConfirm}
              onChange={(e) => setDeactivateConfirm(e.target.checked)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeactivateModal(false)}
            disabled={isDeactivating}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeactivateAccount}
            disabled={!deactivateConfirm || isDeactivating}
          >
            {isDeactivating ? "Deactivating..." : "Deactivate Account"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AccountManagementCard;
