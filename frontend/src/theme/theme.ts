import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#14B8A6"
        },
        secondary: {
            main: "#38BDF8"
        },
        background: {
            default: "#090D16",
            paper: "#0F172A"
        }
    },
    shape: {
        borderRadius: 16
    },
    typography: {
        fontFamily: `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
        h4: {
            fontWeight: 800,
            letterSpacing: "-0.5px"
        },
        h5: {
            fontWeight: 700,
            letterSpacing: "-0.3px"
        },
        h6: {
            fontWeight: 700
        },
        button: {
            textTransform: "none",
            fontWeight: 700,
            letterSpacing: "0.2px"
        }
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backdropFilter: "blur(18px)",
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 15px 40px rgba(0, 0, 0, 0.4)"
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    paddingInline: 22,
                    height: 44,
                    fontWeight: 700
                }
            }
        },
        MuiTextField: {
            defaultProps: {
                variant: "outlined"
            }
        }
    }
});

export default theme;
