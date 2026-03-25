import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SessionSummary } from '../components/SessionSummary';

export const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) return <div>Invalid Session</div>;

  return (
    <div className="bg-bg-base min-h-screen">
      <div className="p-4 border-b border-border-subtle flex items-center sticky top-0 bg-bg-surface z-40">
        <button onClick={() => navigate(-1)} className="text-brand-primary p-2 mr-2 font-display font-bold text-lg">
          ← BACK
        </button>
      </div>
      <SessionSummary sessionId={id} />
    </div>
  );
};
