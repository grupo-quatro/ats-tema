import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2563eb",
      dark: "#1d4ed8",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#334155",
    },
    error: {
      main: "#ef4444",
    },
    success: {
      main: "#16a34a",
    },
  },
  typography: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    h1: {
      fontSize: "30px",
      fontWeight: 500,
      color: "#0f172a",
    },
    h2: {
      fontSize: "24px",
      fontWeight: 500,
      color: "#0f172a",
    },
    body1: {
      fontSize: "16px",
      fontWeight: 400,
      color: "#334155",
    },
    body2: {
      fontSize: "14px",
      fontWeight: 400,
      color: "#475569",
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          boxShadow: "none",
          textTransform: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          backgroundColor: "#f8fafc",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "none",
          border: "1px solid #e2e8f0",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "16px",
        },
      },
    },
  },
});

export default theme;
