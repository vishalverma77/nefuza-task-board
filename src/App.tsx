import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from './app/store';
import { ConnectionForm } from './modules/azureConnection/ConnectionForm';
import { DashboardView } from './modules/dashboard/DashboardView';

export const App: React.FC = () => {
  const isConnected = useSelector((state: RootState) => state.connection.isConnected);

  return isConnected ? <DashboardView /> : <ConnectionForm />;
};

export default App;
