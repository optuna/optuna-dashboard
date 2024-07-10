import { ReactWidget } from '@jupyterlab/ui-components';
import React from 'react';
import { JupyterLabEntrypoint } from './components/JupyterLabEntrypoint';
import { JupyterlabAPIClient } from './apiClient';
import { APIClientProvider } from '@optuna/optuna-dashboard';

const jupyterlabAPIClient = new JupyterlabAPIClient();

export class OptunaDashboardWidget extends ReactWidget {
  constructor() {
    super();
    this.addClass('jp-react-widget');
  }

  render(): JSX.Element {
    return (
      <APIClientProvider apiClient={jupyterlabAPIClient}>
        <JupyterLabEntrypoint />
      </APIClientProvider>
    );
  }
}
