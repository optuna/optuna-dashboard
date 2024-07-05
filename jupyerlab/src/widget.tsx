import { ReactWidget } from '@jupyterlab/ui-components';
import React from 'react';
import { JupyterLabEntrypoint } from './components/JupyterLabEntrypoint';

export class OptunaDashboardWidget extends ReactWidget {
  constructor() {
    super();
    this.addClass('jp-react-widget');
  }

  render(): JSX.Element {
    return <JupyterLabEntrypoint />;
  }
}
