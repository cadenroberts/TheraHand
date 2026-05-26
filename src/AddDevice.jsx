import React, { useEffect, useContext, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FrontHandIcon from '@mui/icons-material/FrontHand';
import BackHandIcon from '@mui/icons-material/BackHand';

const defaultTheme = createTheme();

export default function AddDevice() {
  const theme = useTheme();
  const warningColor = theme.palette.warning.main;

  const navigate = useNavigate();
  const [DeviceID, setDeviceID] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!DeviceID) return;
    setLoading(true);
    setError('');
    try {
      const patient = JSON.parse(localStorage.getItem('user'));
      const patientId = patient?.id;
      const newDevice = { "hardware_id": DeviceID };
      const response = await fetch(`/v0/device/${patientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patient.accessToken}`,
        },
        body: JSON.stringify(newDevice),
      });
      console.log(newDevice);
      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg);
      }

      const json = await response.json();
      localStorage.setItem('device', JSON.stringify(json));
      navigate('/home');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Adding device failed.');
    } finally {
      setLoading(false);
    }
  };

  const warningInputStyle = {
    '& label.Mui-focused': { color: warningColor },
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: warningColor },
      '&:hover fieldset': { borderColor: warningColor },
      '&.Mui-focused fieldset': { borderColor: warningColor },
      '& .MuiInputBase-input': { color: warningColor },
    },
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ bgcolor: 'warning.main', width: 80, height: 80 }}>
              <FrontHandIcon fontSize="large"/>
              <BackHandIcon fontSize="large"/>
          </Avatar>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="Device ID"
              label="Device ID"
              type="DeviceID"
              id="DeviceID"
              autoComplete="current-DeviceID"
              onChange={(e) => setDeviceID(e.target.value)}
              value={DeviceID}
              sx={warningInputStyle}
              InputLabelProps={{
                sx: {
                  color: warningColor,
                  '&.Mui-focused': { color: warningColor },
                  '&.MuiFormLabel-filled': { color: warningColor },
                },
              }}
            />
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <CircularProgress color="warning" />
              </Box>
            ) : (
              <Button
                type="submit"
                role="button"
                aria-label="Login"
                fullWidth
                variant="contained"
                color="warning"
                sx={{ mt: 3, mb: 2 }}
              >
                <Typography variant="overline">Add Device</Typography>
              </Button>
            )}
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
