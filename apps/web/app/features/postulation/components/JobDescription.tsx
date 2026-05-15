"use client"

import { useRouter } from "next/navigation";
import {
    Box,
    Typography,
    Stack,
    Container,
    Button,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
} from "@mui/material";
import {
    Building2,
    MapPin,
    Clock,
    CheckCircle2,
    Calendar,
    ArrowLeft,
} from "lucide-react";
import { Job } from "../../../../../../packages/shared-types/src/models/job";

interface JobDescriptionProps {
    job: Job;
}

export default function JobDescription({ job }: JobDescriptionProps) {
    const router = useRouter();
    const jobTypeLabel =
        job.location === "remote"
            ? "Remoto"
            : job.location === "on-site"
                ? "Presencial"
                : "Híbrido";

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Button
                startIcon={<ArrowLeft size={18} />}
                onClick={() => router.push("/")}
                sx={{ textTransform: "none", mb: 2, color: "text.secondary" }}
            >
                Volver al listado
            </Button>

            <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <Box sx={{ bgcolor: "primary.main", p: 4, color: "white" }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                            <Box sx={{ bgcolor: "white", p: 1.5, borderRadius: "50%", display: "flex", color: "primary.main" }}>
                                <Building2 size={32} />
                            </Box>
                            <Box>
                                <Typography variant="h4" sx={{ fontWeight: 600 }}>{job.title}</Typography>
                                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>{job.department}</Typography>
                            </Box>
                        </Stack>
                        <Chip
                            label={job.status?.toUpperCase()}
                            size="small"
                            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 600, backdropFilter: "blur(4px)" }}
                        />
                    </Stack>
                </Box>

                <Box sx={{ p: 4 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={4} sx={{ mb: 4 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Box sx={{ bgcolor: "primary.light", p: 1, borderRadius: "8px", color: "primary.main", display: "flex" }}>
                                <MapPin size={20} />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Ubicación</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {job.city ? `${job.city}` : "No especificada"}
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Box sx={{ bgcolor: "primary.light", p: 1, borderRadius: "8px", color: "primary.main", display: "flex" }}>
                                <Clock size={20} />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Tipo de empleo</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{jobTypeLabel}</Typography>
                            </Box>
                        </Stack>
                    </Stack>

                    <Divider sx={{ mb: 4 }} />

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Descripción del puesto</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
                        {job.description}
                    </Typography>

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Requisitos</Typography>
                    <List sx={{ mb: 4 }}>
                        {job.requirements.map((req, index) => (
                            <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: "32px", color: "#10b981" }}>
                                    <CheckCircle2 size={18} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={<Typography variant="body2" color="text.secondary">{req}</Typography>}
                                />
                            </ListItem>
                        ))}
                    </List>

                    <Divider sx={{ mb: 4 }} />

                    {job.niceToHave?.length ? (
                        <>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Deseable</Typography>
                            <List sx={{ mb: 4 }}>
                                {job.niceToHave.map((item, index) => (
                                    <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                                        <ListItemIcon sx={{ minWidth: "32px", color: "#2563eb" }}>
                                            <CheckCircle2 size={18} />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={<Typography variant="body2" color="text.secondary">{item}</Typography>}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </>
                    ) : null}

                    <Paper elevation={0} sx={{ mt: 3, p: 4, borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>¿Te interesa esta posición?</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Completa el proceso de postulación y nos pondremos en contacto contigo.
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center" }}>
                            <Button variant="contained" size="large" sx={{ px: 4, textTransform: "none", borderRadius: "8px" }}>
                                Postularme ahora
                            </Button>
                            <Button variant="outlined" size="large" sx={{ px: 4, textTransform: "none", borderRadius: "8px" }}>
                                Ver más ofertas
                            </Button>
                        </Stack>
                    </Paper>

                    <Box sx={{ mt: 3, p: 2, bgcolor: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", gap: 1 }}>
                        <Calendar size={16} color="#64748b" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                            Publicada: <Box component="span" sx={{ fontWeight: 400, color: "text.secondary" }}>
                                {job.publishedAt
                                    ? job.publishedAt.toLocaleDateString("es-AR", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })
                                    : "Fecha no disponible"}
                            </Box>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}
