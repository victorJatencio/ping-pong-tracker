import React, { useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import DashboardCard from '../common/Card';
import OngoingMatchesList from './OngoingMatchesList';
import UpdateScoreModal from './UpdateScoreModal';
import { useGetOngoingMatchesQuery, useGetAllUsersQuery } from '../../store/slices/apiSlice';
import { useAuth } from '../../hooks/useAuth';

/**
 * Main container component for the Ongoing Matches card
 * Manages data fetching, state coordination, and modal interactions
 */
const OngoingMatchesCard = React.memo(() => {
  const { currentUser } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Fetch ongoing matches for current user
  const {
    data: matchesData,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches
  } = useGetOngoingMatchesQuery(currentUser?.uid, {
    skip: !currentUser?.uid,
    pollingInterval: 30000, // Poll every 30 seconds for real-time updates
    refetchOnFocus: true,
    refetchOnReconnect: true
  });

  // Fetch all users for opponent information
  const {
    data: usersData,
    isLoading: usersLoading
  } = useGetAllUsersQuery(undefined, {
    skip: !currentUser?.uid
  });

  // Memoized data processing for performance
  const processedMatches = useMemo(() => {
    if (!matchesData?.matches || !usersData?.users) {
      return [];
    }

    return matchesData.matches.map(match => {
      const isCurrentUserPlayer1 = match.player1Id === currentUser.uid;
      const opponentId = isCurrentUserPlayer1 ? match.player2Id : match.player1Id;
      const opponent = usersData.users.find(user => user.id === opponentId);

      return {
        ...match,
        opponent,
        isCurrentUserPlayer1,
        canUpdateScore: isCurrentUserPlayer1 && match.status === 'in-progress',
        displayScore: isCurrentUserPlayer1 
          ? `${match.player1Score || 0} - ${match.player2Score || 0}`
          : `${match.player2Score || 0} - ${match.player1Score || 0}`
      };
    });
  }, [matchesData?.matches, usersData?.users, currentUser?.uid]);

  // Event handlers with useCallback for performance
  const handleUpdateScore = useCallback((match) => {
    setSelectedMatch(match);
    setShowUpdateModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedMatch(null);
    setShowUpdateModal(false);
  }, []);

  const handleScoreUpdated = useCallback(() => {
    setSelectedMatch(null);
    setShowUpdateModal(false);
    // Refetch data to ensure consistency
    refetchMatches();
  }, [refetchMatches]);

  // Determine loading and error states
  const isLoading = matchesLoading || usersLoading;
  const error = matchesError;

  return (
    <>
      <DashboardCard
        title="Ongoing Matches"
        icon="🏓"
        isLoading={isLoading}
        error={error}
        footerAction={processedMatches.length > 0 ? `${processedMatches.length} active match${processedMatches.length !== 1 ? 'es' : ''}` : null}
      >
        <OngoingMatchesList
          matches={processedMatches}
          loading={isLoading}
          error={error}
          onUpdateScore={handleUpdateScore}
          currentUser={currentUser}
        />
      </DashboardCard>

      {/* Score Update Modal */}
      {selectedMatch && (
        <UpdateScoreModal
          show={showUpdateModal}
          match={selectedMatch}
          onClose={handleCloseModal}
          onScoreUpdated={handleScoreUpdated}
        />
      )}
    </>
  );
});

OngoingMatchesCard.displayName = 'OngoingMatchesCard';

export default OngoingMatchesCard;