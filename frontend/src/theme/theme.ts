import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#E5F842",
            contrastText: "#121316"
        },
        secondary: {
            main: "#94A3B8"
        },
        background: {
            default: "#18191E",
            paper: "#25272F"
        },
        text: {
            primary: "#FFFFFF",
            secondary: "#94A3B8"
        }
    },
    shape: {
        borderRadius: 20
    },
    typography: {
        fontFamily: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
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
                    background: "#25272F",
                    border: "1px solid #333642",
                    boxShadow: "0 15px 40px rgba(0, 0, 0, 0.5)"
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 14,
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
