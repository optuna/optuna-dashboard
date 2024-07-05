import {
  Box,
  Button,
  CssBaseline,
  FormControl,
  Typography
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import StartIcon from '@mui/icons-material/Start';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';
import React, {
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useState
} from 'react';
import { App } from './App';
import { DebouncedInputTextField } from './Debounce';
import { requestAPI } from '../handler';

export const JupyterLabEntrypoint: FC = () => {
  const [ready, setReady] = useState(false);

  if (!ready) {
    return (
      <>
        <CssBaseline />
        <SnackbarProvider maxSnack={3}>
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <JupyterLabStartWidget
              showOptunaDashboard={() => {
                setReady(true);
              }}
            />
          </Box>
        </SnackbarProvider>
      </>
    );
  } else {
    return <App />;
  }
};

const JupyterLabStartWidget: FC<{
  showOptunaDashboard: () => void;
}> = ({ showOptunaDashboard }) => {
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setLoading(true);
    requestAPI<{ is_initialized: boolean }>(`/api/is_initialized`, {
      method: 'GET'
    })
      .then(res => {
        setIsInitialized(res.is_initialized);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        enqueueSnackbar('Failed to check the initialized state', {
          variant: 'error'
        });
        console.error(err);
      });
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isInitialized) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '600px',
          borderRadius: '8px',
          boxShadow: 'rgba(0, 0, 0, 0.08) 0 8px 24px',
          padding: '64px'
        }}
      >
        <Typography variant="h4">Continue or Reset?</Typography>
        <Typography sx={{ margin: '8px 0' }}>
          Continue with the existing storage URL and artifact path settings, or
          you can reset them.
        </Typography>
        <Button
          variant="contained"
          onClick={showOptunaDashboard}
          color="primary"
          startIcon={<StartIcon />}
          sx={{ margin: '8px 0', minWidth: '120px' }}
        >
          Continue
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            setIsInitialized(false);
          }}
          color="primary"
          startIcon={<RestartAltIcon />}
          sx={{ margin: '8px 0', minWidth: '120px' }}
        >
          Reset
        </Button>
      </Box>
    );
  }

  return (
    <StartDashboardForm
      showOptunaDashboard={showOptunaDashboard}
      setLoading={setLoading}
    />
  );
};

const StartDashboardForm: FC<{
  showOptunaDashboard: () => void;
  setLoading: Dispatch<SetStateAction<boolean>>;
}> = ({ showOptunaDashboard, setLoading }) => {
  const [storageURL, setStorageURL] = useState('');
  const [artifactPath, setArtifactPath] = useState('');
  const [isValidURL, setIsValidURL] = useState(false);

  const rfc1738Pattern = new RegExp(
    `[\\w\\+]+://([^:/]*(.*)?@)?((\\[[^/]+\\]|[^/:]+)?([^/]*)?)?(/.*)?`
  );

  const handleValidateURL = (url: string): void => {
    url.startsWith('redis') || url.match(rfc1738Pattern)
      ? setIsValidURL(true)
      : setIsValidURL(false);
  };

  const handleCreateNewDashboard = () => {
    setLoading(true);
    requestAPI<{ is_initialized: boolean }>(`/api/register_dashboard_app`, {
      method: 'POST',
      body: JSON.stringify({
        storage_url: storageURL,
        artifact_path: artifactPath
      })
    })
      .then(res => {
        setLoading(false);
        showOptunaDashboard();
      })
      .catch(err => {
        setLoading(false);
        enqueueSnackbar('Failed to initialize Optuna Dashboard', {
          variant: 'error'
        });
        console.error(err);
      });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '600px',
        borderRadius: '8px',
        boxShadow: 'rgba(0, 0, 0, 0.08) 0 8px 24px',
        padding: '64px'
      }}
    >
      <Typography variant="h4">Initialize Dashboard</Typography>
      <Typography sx={{ margin: '8px 0' }}>
        Please enter a storage URL and an artifact path.
      </Typography>
      <FormControl>
        <DebouncedInputTextField
          onChange={s => {
            handleValidateURL(s);
            setStorageURL(s);
          }}
          delay={500}
          textFieldProps={{
            autoFocus: true,
            fullWidth: true,
            label: 'Storage URL',
            type: 'text',
            sx: { margin: '8px 0' }
          }}
        />
      </FormControl>
      <FormControl>
        <DebouncedInputTextField
          onChange={s => {
            setArtifactPath(s);
          }}
          delay={500}
          textFieldProps={{
            fullWidth: true,
            label: 'Artifact path (Optional)',
            type: 'text',
            sx: { margin: '8px 0' }
          }}
        />
      </FormControl>
      <Button
        variant="contained"
        onClick={handleCreateNewDashboard}
        color="primary"
        disabled={!isValidURL}
        sx={{ margin: '8px 0' }}
      >
        Create
      </Button>
    </Box>
  );
};
