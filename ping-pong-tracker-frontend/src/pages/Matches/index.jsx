import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { fetchMatches } from '../../store/slices/matchesSlice';

const MatchesPage = () => {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.matches);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchMatches());
    }
  }, [status, dispatch]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'failed') {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Matches</h1>
      <ul>
        {items.map((match) => (
          <li key={match.id}>{match.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default MatchesPage;
