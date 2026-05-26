import * as React from 'react';
import { useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MessageIcon from '@mui/icons-material/Message';
import FrontHandIcon from '@mui/icons-material/FrontHand';
import BackHandIcon from '@mui/icons-material/BackHand';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import SignLanguageIcon from '@mui/icons-material/SignLanguage';
import Grid from '@mui/material/Grid';
import { useTheme, useMediaQuery } from '@mui/material';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import PopupState, { bindTrigger, bindMenu } from 'material-ui-popup-state';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import TextField from '@mui/material/TextField';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useNavigate } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import './App.css';
import Divider from '@mui/material/Divider';
import { Canvas } from "@react-three/fiber";
import { HandModel } from "./HandModel";
import PropTypes from 'prop-types';
import Avatar from '@mui/material/Avatar';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
import { OrbitControls } from "@react-three/drei";
import DeviceHubIcon from '@mui/icons-material/DeviceHub';

const drawerWidth = 273;

/**
 * @param {object} props - The props passed to the component.
 * @param {array} props.emails - Array of email objects to display
 * @return {JSX.Element} The rendered ResponsiveDrawer component.
 */

const ExerciseForm = ({
  title,
  name,
  reps,
  flexion,
  finger,
  setName,
  setReps,
  setFlexion,
  setFinger,
  onSubmit,
}) => (
    <>
      <TextField
        fullWidth
        size="small"
	label="Exercise Name"
        variant="outlined"
        color="warning"
	value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ mb: 1 , mt: 1}}
	InputLabelProps={{ sx: { typography: 'overline' } }}
        inputProps={{ sx: { typography: 'overline', paddingTop: '18px', paddingBottom: '15px', lineHeight: 1.2 } }} 
      />
      <TextField
        fullWidth
	size="small"
        label="Finger"
        variant="outlined"
        color="warning"
        value={finger}
        onChange={(e) => setFinger(e.target.value)}
        sx={{ mb: 1 }}
        InputLabelProps={{ sx: { typography: 'overline' } }}   
        inputProps={{ sx: { typography: 'overline', paddingTop: '18px', paddingBottom: '15px', lineHeight: 1.2 } }}
      />
      <TextField
        fullWidth
	size="small"
        label="Flexion Angle"
        variant="outlined"
        color="warning"
        type="number"
        value={flexion}
        onChange={(e) => setFlexion(e.target.value)}
        sx={{ mb: 1 }}
        InputLabelProps={{ sx: { typography: 'overline' } }}   
        inputProps={{ sx: { typography: 'overline', paddingTop: '18px', paddingBottom: '15px', lineHeight: 1.2 } }}   
      />
      <TextField
        fullWidth
	size="small"
        label="Reps"
        variant="outlined"
        color="warning"
        type="number"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        sx={{ mb: 1.5 }}
        InputLabelProps={{ sx: { typography: 'overline' } }}   
        inputProps={{ sx: { typography: 'overline', paddingTop: '18px', paddingBottom: '15px', lineHeight: 1.2 } }}   
      />
      <Button
        variant="contained"
        color="warning"
        fullWidth
        onClick={onSubmit}
	sx={{ mb: 0.5 }}
      >
        {title}
      </Button>
    </>
  );

const MessageDialog = React.memo(({ open, onClose, messageContent, setMessageContent, messages, selectedUser, isDoctor, doctorName, handleSendMessage, handleDeleteMessage }) => (
  <Dialog fullScreen open={open} onClose={onClose}>
    <Box sx={{ position: 'fixed', bottom: 5, right: 10, zIndex: 6000 }}>
      <TextField
        fullWidth
        multiline
        maxRows={10}
        variant="outlined"
        label={
          isDoctor
            ? `Message ${selectedUser?.name || 'Patient'}`
            : `Message ${doctorName || 'Doctor'}`
        }
        color="warning"
        placeholder=""
        value={messageContent}
        onChange={(e) => setMessageContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
	InputLabelProps={{ sx: { typography: 'overline' } }}
        inputProps={{ sx: { typography: 'overline', paddingTop: '10px', paddingBottom: '7px', lineHeight: 1.2 } }}
      />
    </Box>
    <AppBar sx={{ position: 'relative' }} color="warning">
      <Toolbar>
        <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
        <Typography sx={{ ml: 1, mt: 0.25, flex: 1 }} variant="overline">
          Messages
        </Typography>
      </Toolbar>
    </AppBar>
    <List>
      {messages.map((msg) => {
        const isSender = msg.sender_id === JSON.parse(localStorage.getItem('user'))?.id;
        return (
          <React.Fragment key={msg.id}>
            <ListItemText
              sx={{ ml: isSender ? '55vw' : 3, mr: isSender ? '10vw' : '55vw' }}
              disableTypography
              primary={
                <>
                  <Box>
                    <Typography variant="overline" color="text.primary">
                      {isSender
                        ? `YOU AT ${new Date(msg.sent_at).toLocaleString()}`
                        : `${(selectedUser?.name || doctorName || selectedUser?.email || 'UNKNOWN').toUpperCase()} AT ${new Date(msg.sent_at || Date.now()).toLocaleString()}`
                      }
                    </Typography>

                  </Box>
                  <Box>
                    <Typography variant="overline" color="warning.main" sx={{ mt: 0.25 }}>
                      {msg.content}
                    </Typography>
                  </Box>
                </>
              }
            />
            {isSender && (
              <Box sx={{ml: '93vw' < 5 ? 5 : '94vw', position: "relative", mt: -5}}>
              <IconButton edge="start" color="warning">
                 <DeleteOutlineIcon onClick={() => handleDeleteMessage(msg.id)}/>
              </IconButton>
              </Box>
            )}
            <Divider />
          </React.Fragment>
        );
      })}
    </List>
  </Dialog>
));



function Home() {

    // for the patient view
  const [viewExerciseName, setViewExerciseName] = React.useState('');
  const [viewExerciseFlexion, setViewExerciseFlexion] = React.useState('');
  const [viewExerciseReps, setViewExerciseReps] = React.useState('');
  const [viewExerciseFinger, setViewExerciseFinger] = React.useState('');
  const [exerciseNames, setExerciseNames] = React.useState([]);

  const [isClosed, setIsClosed] = React.useState(false);
  const history = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [startDate, setStartDate] = React.useState(new Date());

  const [selectedFinger, setSelectedFinger] = React.useState(null);

  const [selectedExercise, setSelectedExercise] = React.useState(null);

  const [replayData, setReplayData]   = React.useState(null);
  const [replayKey, setReplayKey]     = React.useState(0);

  const [simulateKey, setSimulateKey] = React.useState(0);


  const handleLogout = () => {
    localStorage.removeItem('user');
    setSelectedUser('');
    history('/login');
  };

  const handleCreate = () => {
    history('/create');
  }

  const handleDevice = () => {
    history('/device');
  }

  const handleSelect = (finger, popupState) => {
    setSelectedFinger(finger);
    popupState.close();
  };
  const [patients, setPatients] = React.useState([]);
  const initialUser = React.useMemo(() => JSON.parse(localStorage.getItem('user')), []);

  const [selectedUser, setSelectedUser] = React.useState(initialUser);
  const [assignment, setSelectedAssignment] = React.useState(null);
  const [messageContent, setMessageContent] = React.useState('');
  const [device, setDevice] = React.useState(null);

  // ─── helper to turn various timestamps into "YYYY/MM/DD HH:MM"
  const formatTimestamp = (ts) => {
    if (!ts) return '';
    let datePart, timePart;
    if (ts.includes(' ')) {
      // e.g. "2025-05-20 17:03:59.024028"
      [datePart, timePart] = ts.split(' ');
    } else if (ts.includes('T')) {
      // e.g. "2025-05-20T17:03:59.024028Z"
      [datePart, timePart] = ts.split('T');
    } else {
      // unexpected format—just return it
      return ts;
    }
    // drop fractional seconds and timezone
    timePart = timePart.split('.')[0];    // "17:03:59"
    const date = datePart.replace(/-/g, '/');
    const time = timePart.slice(0, 5);     // "17:03"
    return `${date} ${time}`;
  };


  const handleSendMessage = async () => {
    if (!messageContent?.trim()) return;
  
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
  
    try {
      const patientId = user.role === 'doctor' ? selectedUser?.id : user.id;
  
      const response = await fetch(`/v0/sendmessage/${patientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({ content: messageContent }),
      });
      console.log(response);
      if (response.ok) {
        const data = await response.json(); // expecting id, sent_at, etc.
  
        const newMessage = {
          id: data.id, // the UUID returned from backend
          sender_id: user.id,
          recipient_id: user.role === 'doctor' ? selectedUser?.id : doctorID,
          content: messageContent,
          sent_at: data.sent_at, // get sent_at from backend
        };
  
        console.log('New message:', newMessage);
        setMessages((prev) => [...prev, newMessage]);
        setMessageContent('');
      } else {
        const errorText = await response.text();
        console.error('Send message failed:', errorText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleRunAssignment = async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  console.log(user);
  console.log(device);
  console.log(assignment);
  if (!user || !device || !assignment) {
    alert('Missing user, device, or selected assignment');
    return;
  }

  try {
    const response = await fetch(`/v0/runner/${device.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          name: assignment.data.name,
          finger: assignment.data.finger,
          flexion: assignment.data.flexion,
          reps: assignment.data.reps,
          hardware_id: device.hardware_id
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to run assignment: ${errorText}`);
    }

    const result = await response.json();
    console.log('Runner data posted:', result);
    alert('Exercise run sent successfully!');
  } catch (err) {
    console.error('Error running assignment:', err);
    alert('Error sending run data. See console for details.');
  }
  };

  const handleAssignmentSubmit = async ({name, finger, flexion, reps}) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user) return;
  try {
    const response = await fetch(`/v0/assignments/patient/${selectedUser?.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({ name, finger, flexion, reps }),
    });
 
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create assignment: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error posting assignment:', err);
    throw err;
  }
  };

  const modifyAssignment = async (updates) => {
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) return;
  try {
    const response = await fetch(`/v0/assignments/${assignment?.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update assignment: ${errorText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error modifying assignment:', err);
    throw err;
  }
  };

  const handleDeleteMessage = async (messageId) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
  
    try {
      console.log(messageId);
      const response = await fetch(`/v0/deletemessage/${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });
  
      if (response.ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      } else {
        const errorText = await response.text();
        console.error('Delete message failed:', errorText);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };


  useEffect(() => {
    const fetchPatients = async () => {
      const stored = JSON.parse(localStorage.getItem('user'));

      if (!stored) {
        console.warn('No user in localStorage');
        return;
      }

      if (stored?.role !== 'doctor') {
        return;
      }

      const response = await fetch(`/v0/home/${stored.id}`, {
        headers: {
          Authorization: `Bearer ${stored.accessToken}`,
          Accept: 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
        setSelectedUser(data[0]);
      } else {
        const err = await response.text();
        console.error('Failed to load patients:', err);
      }
    };

    fetchPatients();
  }, []);

  const handleAssignmentSelect = (assignment) => {
    setSelectedAssignment(assignment);
  }
  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const handleSelectExercise = (exercise, popupState) => { //edits to autofill modify exercise with exercise info
    setSelectedAssignment(exercise);
    setSelectedExercise(exercise.data.name);

    // auto-fill the modify form
    setMExerciseName(exercise.data.name);
    setMExerciseFinger(exercise.data.finger);
    setMExerciseFlexion(exercise.data.flexion.toString());
    setMExerciseReps(exercise.data.reps.toString());

    // **new** patient-side autofill:
    setViewExerciseName(exercise.data.name);
    setViewExerciseFlexion(exercise.data.flexion);
    setViewExerciseReps(exercise.data.reps);
    setViewExerciseFinger(exercise.data.finger);

    popupState.close();
  };


  const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  });

  const [openMessages, setOpenMessages] = React.useState(false);

  const handleClickOpenMessages = () => {
    setOpenMessages(true);
  };

  const handleCloseMessages = () => {
    setOpenMessages(false);
  };

  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState('');
  const [noButtons, setNoButtons] = React.useState(false);
  useEffect(() => {
    if (!isMobile) {
      setNoButtons(false);
      setMobileOpen(false);
    }
  }, [isMobile]);

  const handleClickOpen = () => {
    setOpen(true);
    setNoButtons(!noButtons);
  };

  const handleClose = (value) => {
    setOpen(false);
    setSelectedValue(value);
    setNoButtons(!noButtons);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };



  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
    setNoButtons(!noButtons);
  };

  const [value, setValue] = React.useState(0);
  const isDoctor = JSON.parse(localStorage.getItem('user'))?.role === 'doctor';

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  function SimpleDialog(props) {
    const { onClose, selectedValue, open } = props;

    const handleClose = () => {
      onClose(selectedValue);
    };

    const handleListItemClick = (value) => {
      onClose(value);
    };

    return (
      <Dialog onClose={handleClose} open={open}>
        {isDoctor ? (<DialogTitle sx={{ ml: 5 }}><Typography variant="overline" color="warning">SELECT A PATIENT</Typography></DialogTitle>) : (<DialogTitle sx={{ ml: 5 }}><Typography variant="overline" color="warning">SELECT A DEVICE</Typography></DialogTitle>)}
        <List sx={{ pt: 0 }}>
          {isDoctor ? (<>{patients.map((user) => (
            <ListItem disablePadding key={user.id}>
              <ListItemButton onClick={() => {
                handleUserSelect(user);
                handleClose();
                handleListItemClick(user.name);
              }}
                selected={selectedUser?.id === user.id}
                sx={{
                  '&:hover': {
                    backgroundColor: 'warning.light',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'warning.dark',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'warning.dark',
                    },
                  },
                }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.main' }} style={{ color: 'white' }}>
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="overline" color="text.primary">
                      {user.email}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
            <ListItem disablePadding>
              <ListItemButton
                autoFocus
                onClick={() => handleCreate()} sx={{
                  '&:hover': {
                    backgroundColor: 'warning.light',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'warning.dark',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'warning.dark',
                    },
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar>
                    <AddIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="overline" color="text.primary">
                      CREATE PATIENT
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem></>) : (<>{devices.map((Device) => (
	    <ListItem disablePadding key={Device.id}>
              <ListItemButton onClick={() => {
                setDevice(Device);
                handleClose();
                handleListItemClick(Device.hardware_id);
              }}
                selected={device?.id === Device.id}
                sx={{
                  '&:hover': {
                    backgroundColor: 'warning.light',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'warning.dark',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'warning.dark',
                    },
                  },
                }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.main' }} style={{ color: 'white' }}>
                    <DeviceHubIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="overline" color="text.primary">
                      {Device.hardware_id}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
            <ListItem disablePadding>
              <ListItemButton
                autoFocus
                onClick={() => handleDevice()} sx={{
                  '&:hover': {
                    backgroundColor: 'warning.light',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'warning.dark',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'warning.dark',
                    },
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar>
                    <AddIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="overline" color="text.primary">
                      ADD DEVICE
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem></>)}
          <ListItem disablePadding>
            <ListItemButton
              autoFocus
              onClick={() => handleLogout()} sx={{
                '&:hover': {
                  backgroundColor: 'warning.light',
                },
                '&.Mui-selected': {
                  backgroundColor: 'warning.dark',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'warning.dark',
                  },
                }, mb: -0.95
              }}
            >
              <ListItemAvatar >
                <Avatar>
                  <LogoutIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText sx={{ mr: 1 }}
                primary={
                  <Typography variant="overline" color="text.primary" >
                    Logout
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Dialog>
    );
  }

  SimpleDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
    selectedValue: PropTypes.string.isRequired,
  };

  function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
      </div>
    );
  }

  CustomTabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
  };

  function a11yProps(index) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }

  const [messages, setMessages] = React.useState([]);
  const [assignments, setAssignments] = React.useState([]);

  useEffect(() => {
    const fetchMessages = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;

      let patientId = user.id; // default for patient

      // If the user is a doctor, use selectedUser.id as the patient
      if (user.role === 'doctor') {
        if (!selectedUser?.id) return; // no patient selected yet
        patientId = selectedUser.id;
      }

      const response = await fetch(`/v0/getmessages/${patientId}`, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        const err = await response.text();
        console.log(err);
      }
    };

    fetchMessages();
  }, [selectedUser]);

  useEffect(() => {
    const fetchAssignments = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;

      let patientId = user.id; // default for patient

      // If the user is a doctor, use selectedUser.id as the patient
      if (user.role === 'doctor') {
        if (!selectedUser?.id) return; // no patient selected yet
        patientId = selectedUser.id;
      }

      const response = await fetch(`/v0/assignments/patient/${patientId}`, {
	method: 'GET',
	headers: {
          Authorization: `Bearer ${user.accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      } else {
        const err = await response.text();
        console.log(err);
      }
    };

    fetchAssignments();
  }, [selectedUser]);

  const [devices, setDevices] = React.useState([]);

  useEffect(() => {
    const fetchDevices = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;

      let patientId = user.id; // default for patient

      // If the user is a doctor, use selectedUser.id as the patient
      if (user.role === 'doctor') {
        if (!selectedUser?.id) return; // no patient selected yet
        patientId = selectedUser.id;
      }

      const response = await fetch(`/v0/devices/${patientId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data);
	setDevice(data[0]);
      } else {
        const err = await response.text();
        console.log(err);
      }
    };

    fetchDevices();
  }, [selectedUser]);

  const [doctorName, setDoctorName] = React.useState('');
  const [doctorID, setDoctorID] = React.useState('');

  const fetchDeviceResults = async (deviceId) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !deviceId) return;

  try {
    const response = await fetch(`/v0/results/${deviceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch results: ${error}`);
    }

    const results = await response.json();
    console.log('Results:', results);
    return results;
  } catch (err) {
    console.error('Error fetching results:', err);
  }
  };

  const [results, setResults] = React.useState([]);
  const [selectedResult, setSelectedResult] = React.useState(null);
  useEffect(() => {
    // if there's no device, clear out everything
    if (!device) {
      setResults([]);
      setSelectedResult(null);
      return;
    }

    // otherwise fetch the new device’s results
    (async () => {
      const data = await fetchDeviceResults(device.id);
      if (Array.isArray(data)) {
        setResults(data);
      } else {
        setResults([]);
      }
      setSelectedResult(null);
    })();
  }, [device]);



  const handleSelectResult = (result, popupState) => { //edits to autofill modify exercise with exercise info
    setSelectedResult(result);
    popupState.close();
  };

  useEffect(() => {
    const fetchDoctorName = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || user.role !== 'patient') return;
      const response = await fetch(`/v0/doctor/${user.id}`, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          Accept: 'application/json',
        },
      });
      if (response.ok) {
        const doctor = await response.json(); // should return doctor object with .name
        setDoctorName(doctor.name);
        setDoctorID(doctor.id);
      } else {
        console.error('Failed to fetch doctor');
      }
    };

    fetchDoctorName();
  }, []);

  const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: (theme.vars ?? theme).palette.text.secondary,
    ...theme.applyStyles('dark', {
      backgroundColor: '#1A2027',
    }),
  }));

  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: theme.palette.warning.main,
      color: theme.palette.common.white,
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 14,
    },
  }));

  const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.action.hover,
    },
    // hide last border
    '&:last-child td, &:last-child th': {
      border: 0,
    },
  }));

  const [exerciseName, setExerciseName] = React.useState('');
  const [exerciseReps, setExerciseReps] = React.useState('');
  const [exerciseFlexion, setExerciseFlexion] = React.useState('');
  const [exerciseFinger, setExerciseFinger] = React.useState('');

  const handleExerciseSubmit = () => {
    if (!exerciseName || !exerciseReps || !exerciseFlexion || !exerciseFinger) {
      alert('Please fill out all fields');
      return;
    }

    const name = exerciseName.trim();
    const reps = Number(exerciseReps);
    const flexion = Number(exerciseFlexion);
    const finger = exerciseFinger.trim();
    
    if (isNaN(reps) || isNaN(flexion)) {
      alert('Reps and Flexion must be valid numbers');
      return;
    }
    // TEMPORARILY COMMENT OUT handleExerciseCreate(name, reps, flexion);
    handleAssignmentSubmit({name, finger, flexion, reps});

    // Clear inputs
    setExerciseName('');
    setExerciseReps('');
    setExerciseFlexion('');
    setExerciseFinger('');
  };

  const [MexerciseName, setMExerciseName] = React.useState('');
  const [MexerciseReps, setMExerciseReps] = React.useState('');
  const [MexerciseFlexion, setMExerciseFlexion] = React.useState('');
  const [MexerciseFinger, setMExerciseFinger] = React.useState('');

  const handleMExerciseSubmit = () => {

    const name = MexerciseName.trim();
    const reps = Number(MexerciseReps);
    const flexion = Number(MexerciseFlexion);
    const finger = MexerciseFinger.trim();

  const updates = {};

  if (name) updates.name = name;
  if (finger) updates.finger = finger;
  if (!isNaN(flexion)) updates.flexion = flexion;
  if (!isNaN(reps)) updates.reps = reps;

  if (Object.keys(updates).length === 0) {
    alert('Please modify at least one field.');
    return;
  }
    modifyAssignment(updates);
    // Clear inputs
    setMExerciseName('');
    setMExerciseReps('');
    setMExerciseFlexion('');
    setMExerciseFinger('');
  };
  const drawer = (
    <div>
      <Toolbar />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', overflow:'hidden' }}>
        <Tabs TabIndicatorProps={{
          style: {
            backgroundColor: '#ed6c02', // warning.main default from MUI
          },
        }} value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label={
            <Box display="flex" alignItems="center" gap={4.65} sx={{mr: 4.65}}>
              <HistoryIcon sx={{ mb: 0.25}} />
              History
            </Box>
          } sx={{
            '&.Mui-selected': {
              color: 'warning.main',
            },
          }}{...a11yProps(0)} /> {/* Changed from 1 to 0 for HISTORY */}
          <Tab label={
            <Box display="flex" alignItems="center" gap={4.65} sx={{mr: 4.65}}>
              <SignLanguageIcon sx={{ mb: 0.75}} />
              Exercises
            </Box>
          } sx={{
            '&.Mui-selected': {
              color: 'warning.main',
            },
          }}{...a11yProps(1)} /> {/* Changed from 2 to 1 for EXERCISES */}
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0} sx={{overflow: 'hidden'}}> {/* Changed from 1 to 0 for HISTORY */}
	<PopupState variant="popover" popupId="demo-popup-menu">
            {(popupState) => (
              <React.Fragment>
                <Button variant="contained" color="warning" {...bindTrigger(popupState)} sx={{
                  position: 'fixed', top: 119, left: 0,
                  width: `calc(${1.5025 * drawerWidth}px)`
                }}>
                  <Typography variant="overline">Select an Exercise Result ...</Typography>
                </Button>
                <Menu {...bindMenu(popupState)}>
                  {results.length > 0 ? results.map((result) => {
                    // format the raw timestamp
                    const displayTs = formatTimestamp(result.created_at);
                    return (
                      <MenuItem
                        key={result.id}
                        onClick={() => handleSelectResult(result, popupState)}
                      >
                        <Typography
                          variant="overline"
                          // highlight the currently selected result
                          color={selectedResult?.id === result.id ? "warning" : "text.primary"}
                        >
                          {displayTs}
                        </Typography>
                      </MenuItem>
                    );
                  }) : (
                    <MenuItem disabled>
                      <Typography variant="overline" color="text.secondary">
                        No exercise results found
                      </Typography>
                    </MenuItem>
                  )}
                </Menu>
              </React.Fragment>
            )}
          </PopupState>
	  {/*<>  REMOVED DATE PICKER
          <Box sx={{
            position: 'fixed',
            minWidth: 628,
            top: 131,
            left: 120,
            zIndex: 1300
          }}>
            <>
              <style>
                {`
              .react-datepicker {
                font-size: 0.75rem !important;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                font-weight: 500;
                font-family: "Roboto", "Helvetica", "Arial", sans-serif;
              }
            `}
              </style>

              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                showTimeSelect
                dateFormat="Pp"
                customInput={
                  <TextField
                    variant="outlined"
                    label="Start Date"
                    color="warning"
                    InputProps={{
                      sx: {
                        typography: 'overline',
                      },
                    }}
                  />
                }
              />
            </>
          </Box>*/}
	  {/*<List sx={{
              position: 'absolute',
              top: 186,
              py: 0,
	      left: 20,
	      maxHeight: 343,
	      overflow: 'auto',
	      bottom: 20,
              width: 370,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}>*/}
        <List sx={{
          position: 'absolute',
          top: 186,
          left: 20,
          py: 0,
          width: 370,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
            }}>
            <ListItem>
              <ListItemText primary={<Typography variant="overline" color="text.primary">{selectedResult ? selectedResult.data.name : "Exercise Name"}</Typography>} />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary={<Typography variant="overline" color="text.primary">{selectedResult ? selectedResult.data.finger : "Exercise Finger"}</Typography>} />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary={<Typography variant="overline" color="text.primary">{selectedResult ? selectedResult.data.flexion : "Exercise Flexion"}</Typography>} />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary={<Typography variant="overline" color="text.primary">{selectedResult ? selectedResult.data.reps : "Exercise Reps"}</Typography>} />
            </ListItem>
            {/*<Divider component="li" />
            <ListItem>
              <ListItemText primary={<Typography variant="overline" color="text.primary">{selectedResult ? selectedResult.data.result : "Exercise Result"}</Typography>} />
            </ListItem>
	    <Divider component="li" />
	    <ListItem>
	      <ListItemText primary={<Typography variant="overline" color="text.primary">{selectedResult ? selectedResult.data.date : "Exercise Date & Time"}</Typography>} />
	    </ListItem> */}
          </List>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1} sx={{overflow: 'hidden'}}> {/* Changed from 0 to 1 for EXERCISES */} 
        <Box sx={{ display: 'flex', overflow: 'hidden' }}>
          <PopupState variant="popover" popupId="demo-popup-menu">
            {(popupState) => (
              <React.Fragment>
                <Button variant="contained" color="warning" {...bindTrigger(popupState)} sx={{
                  position: 'fixed', top: 119, left: 0,
                  width: `calc(${1.5025 * drawerWidth}px)`
                }}>
                  <Typography variant="overline">{"Select an Exercise ..."}</Typography>
                </Button>
                <Menu {...bindMenu(popupState)}>
                  {assignments.length > 0
                    ? assignments.map(assignment => (
                        <MenuItem key={assignment.id} onClick={() => handleSelectExercise(assignment, popupState)}>
                          <Typography color={selectedExercise === assignment.data.name ? "warning" : "text.primary"} variant="overline">
                            {assignment.data.name}
                          </Typography>
                        </MenuItem>
                      ))
                    : <MenuItem disabled>
                        <Typography variant="overline" color="text.secondary">
                          {`No exercises found`}
                        </Typography>
                      </MenuItem>
                  }
                </Menu>

              </React.Fragment>
            )}
          </PopupState>
          <List sx={{
              position: 'absolute',
	      top: 186,
	      py: 0,
	      left: 20,
	      width: 370,
	      maxHeight: 229,
	      bottom: 20,
	      display: isDoctor ? 'none' : 'block',
	      overflow: 'auto',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}>
            <ListItem> {/* EXERCISE DISPLAY ON PATIENT SIDE */}
                  <ListItemText primary={<Typography variant="overline" color="text.primary">{viewExerciseName ? viewExerciseName : "Exercise Name"}</Typography>}/>
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary={<Typography variant="overline" color="text.primary">{viewExerciseFinger ? viewExerciseFinger : "Exercise Finger"}</Typography>} />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary={<Typography variant="overline" color="text.primary">{viewExerciseFlexion ? viewExerciseFlexion : "Exercise Flexion"}</Typography>}/>
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary={<Typography variant="overline" color="text.primary">{viewExerciseReps ? viewExerciseReps : "Exercise Reps"}</Typography>} />
    	        </ListItem>
	  </List>
        </Box>
      </CustomTabPanel>

    </div>
  );


  return (
    <Box sx={{ display: 'flex', overflow:'hidden' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, overflow: 'hidden' }}
        color="warning"
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div"
            data-testid="appbar-title" color="inherit">
            <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
              <Typography variant='overline'>
                {`THERAHAND`}
              </Typography>
              <FrontHandIcon fontSize="small" sx={{ ml: 1.5, mb: 0.5 }} />
              <BackHandIcon fontSize="small" sx={{ mb: 0.5 }} />
            </Box>
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ overflow: 'hidden', width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
          <Drawer
            // container={c}
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerClose}
            ModalProps={{
              keepMounted: true,
            }}
            PaperProps={{
              sx: {
                backgroundColor: "lightgrey",
                color: "black",
              }
            }}
            sx={{
              'display': { md: 'block', lg: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth * 1.5025 },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            PaperProps={{
              sx: {
                backgroundColor: "lightgrey",
                color: "black",
              }
            }}
            sx={{
              'display': { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth * 1.5025 },
            }}
            open
          >
            {drawer}
          </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ overflow: 'hidden', flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        {!openMessages && !noButtons && !mobileOpen && (
          <><Button variant="contained" color="warning"
            sx={{
              position: 'fixed',
              bottom: 45,
              left: isMobile ? 10 : 1.5025 * drawerWidth + 4,
              zIndex: 2000,
              display: value && !isDoctor ? 'block' : 'none',
            }}
            onClick={() => handleRunAssignment()}
          >
		{"Run"}
          </Button>
            <Button
              variant="contained"
              color="warning"
              sx={{
                position: 'fixed',
                bottom: 5,
                left: isMobile ? 10 : 1.5025 * drawerWidth + 4,
                zIndex: 2000,
              }}
              onClick={() => {
                if (value === 0 && selectedResult) {
                  // HISTORY tab: start a Replay
                  setReplayData(selectedResult.data);
                  setReplayKey(k => k + 1);
                } else if (value === 1) {
                  // EXERCISES tab: still just toggle Simulate
                  setSimulateKey(k => k + 1);
                }
              }}
            >
              {value === 1 ? "Simulate" : "Replay"}
            </Button></>
        )}
        {!openMessages && !noButtons && (
          <Button variant="contained" color="warning"
            sx={{
              position: 'fixed',
              bottom: 5,
              right: 10,
              zIndex: 2000,
            }}
            onClick={handleClickOpenMessages}
          >
            <Typography variant="overline">Messages</Typography><MessageIcon sx={{ ml: 1 }} />
          </Button>
        )}
        <MessageDialog
          open={openMessages}
          onClose={handleCloseMessages}
          messageContent={messageContent}
          setMessageContent={setMessageContent}
          handleSendMessage={handleSendMessage}
          messages={messages}
          selectedUser={selectedUser}
          isDoctor={isDoctor}
          doctorName={doctorName}
          doctorID={doctorID}
          handleDeleteMessage={handleDeleteMessage}
        />
         <Box
  sx={{
    position: 'fixed',
    top: 185,
    display: (isDoctor && value) ? 'block' : 'none',
    maxHeight: 587,
    left: 17,
    bottom: 20,
    width: 375,
    overflowY: 'auto',
    p: 1,
    mb: 1,
    backgroundColor: 'background.paper',
    borderRadius: 2,
    boxShadow: 3,
    zIndex: (theme) => theme.zIndex.drawer + 1,
  }}
>
      <ExerciseForm
        title="Modify Exercise"
        name={MexerciseName}
        reps={MexerciseReps}
        finger={MexerciseFinger}
        flexion={MexerciseFlexion}
        setName={setMExerciseName}
        setReps={setMExerciseReps}
        setFlexion={setMExerciseFlexion}
        setFinger={setMExerciseFinger}
        onSubmit={handleMExerciseSubmit}
      />
      <ExerciseForm
        title="Create Exercise"
        name={exerciseName}
        reps={exerciseReps}
        finger={exerciseFinger}
        flexion={exerciseFlexion}
        setName={setExerciseName}
        setReps={setExerciseReps}
        setFlexion={setExerciseFlexion}
        setFinger={setExerciseFinger}
        onSubmit={handleExerciseSubmit}
      />
</Box>

        <IconButton variant="contained" color="warning"
          sx={{
            position: 'fixed',
            top: 10,
            right: 10,
            zIndex: 2000,
          }} style={{ color: 'white' }}
          onClick={handleClickOpen}
        >
          <Typography variant='overline'>{isDoctor ? selectedUser.name : JSON.parse(localStorage.getItem('user')).name}</Typography><AccountCircleIcon sx={{ ml: 0.75, mb: 0.275 }} />
        </IconButton>
        <SimpleDialog
          selectedValue={selectedValue}
          open={open}
          onClose={handleClose}
        />
        {!openMessages && (
          <Box
  sx={{
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: isMobile
      ? '100%'
      : `calc(100% - ${1.5025 * drawerWidth}px)`,
    overflow: 'hidden',
  }}
>
  <Box
    sx={{
      position: 'relative',
      height: '148%',
      top: 64,
      bottom: 30,
    }}
  >
    <Canvas camera={{ position: [0, 0, 5] }}>
       <ambientLight />
      <pointLight position={[10, 10, 10]} />
      {/* <HandModel isClosed={isClosed} /> */}
      {/* pass the selected finger and flexion from state */}
      <HandModel
        /* simulate props */
        finger={viewExerciseFinger}
        flexion={viewExerciseFlexion}
        reps={viewExerciseReps}
        simulateKey={simulateKey}

        /* replay props */
        replayKey={replayKey}
        replayData={replayData}
      />
      <OrbitControls />
    </Canvas>
  </Box>
</Box>
)}

      </Box>
    </Box>
  );
}

export default Home;
