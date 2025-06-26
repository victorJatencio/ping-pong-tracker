import React from 'react';
import { useSelector } from 'react-redux';
import MatchCreationModal from '../../match/MatchCreate/MatchCreationModal';
import UpdateScoreModal from '../../dashboard/UpdateScoreModal';
import { selectMatchCreationModal, selectScoreUpdateModal } from '../../../store/slices/uiSlice';

/**
 * Modal Manager Component
 * Centralized component that manages all application modals
 * This follows the industry standard of having a single modal manager
 */
const ModalManager = () => {
  // Get modal states from Redux
  const matchCreationModal = useSelector(selectMatchCreationModal);
  const scoreUpdateModal = useSelector(selectScoreUpdateModal);

  return (
    <>
      {/* Match Creation Modal */}
      <MatchCreationModal 
        show={matchCreationModal.isOpen}
        data={matchCreationModal.data}
      />
      
      {/* Score Update Modal */}
      {scoreUpdateModal.isOpen && scoreUpdateModal.data && (
        <UpdateScoreModal
          show={scoreUpdateModal.isOpen}
          match={scoreUpdateModal.data}
        />
      )}
      
      {/* Future modals can be added here */}
    </>
  );
};

export default ModalManager;