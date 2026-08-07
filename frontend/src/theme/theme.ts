import { createTheme } from "@mui/material/styles";

const theme = createTheme({

    palette: {

        mode: "light",

        primary: {

            main: "#4F46E5"

        },

        secondary: {

            main: "#7C3AED"

        },

        background: {

            default: "#EEF4FF",

            paper: "rgba(255,255,255,0.72)"

        }

    },

    shape: {

        borderRadius: 16

    },

    typography: {

        fontFamily:

            `"Inter","Poppins","Roboto",sans-serif`,

        h4: {

            fontWeight: 800

        },

        h5: {

            fontWeight: 700

        },

        h6: {

            fontWeight: 700

        },

        button: {

            textTransform: "none",

            fontWeight: 600

        }

    },

    components: {

        MuiPaper: {

            styleOverrides: {

                root: {

                    backdropFilter: "blur(18px)",

                    background:

                        "rgba(255,255,255,.72)",

                    border:

                        "1px solid rgba(255,255,255,.55)",

                    boxShadow:

                        "0 15px 40px rgba(70,90,140,.12)"

                }

            }

        },

        MuiButton: {

            styleOverrides: {

                root: {

                    borderRadius: 16,

                    paddingInline: 22,

                    height: 48

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
