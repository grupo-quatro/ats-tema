import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

export default function PostulationPage() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Card sx={{ maxWidth: 600, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h1">Carga de candidato aquí</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
