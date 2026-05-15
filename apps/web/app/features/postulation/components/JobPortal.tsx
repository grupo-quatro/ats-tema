"use client"

import { Container, Box, Typography, Card, TextField, InputAdornment, Stack } from "@mui/material";
import { Briefcase, Search } from "lucide-react";
import JobCard from "./JobCard";

export default function JobPortal() {

    const JOBS_DATA = [
        {
            title: "Backend Developer Node.js",
            description: "Sumate para escalar microservicios y optimizar bases de datos en MongoDB. Valoramos conocimientos en arquitecturas limpias.",
            location: "Córdoba, Argentina",
            modality: "Remote",
            creationDate: "12/05/2026"
        },
        {
            title: "UX/UI Designer",
            description: "Diseñá interfaces modernas y funcionales. Trabajo codo a codo con el equipo de front para asegurar la fidelidad de los mockups de Figma.",
            location: "Rosario, Argentina",
            modality: "Hybrid",
            creationDate: "11/05/2026"
        },
        {
            title: "Fullstack Developer (React/Python)",
            description: "Buscamos un perfil versátil que pueda manejar el frontend en React y servicios de inteligencia artificial en Python.",
            location: "Buenos Aires, Argentina",
            modality: "Remote",
            creationDate: "10/05/2026"
        },
        {
            title: "QA Automation Engineer",
            description: "Responsable de asegurar la calidad mediante tests automatizados (Cypress/Playwright). Implementación de CI/CD.",
            location: "Mendoza, Argentina",
            modality: "Full Time",
            creationDate: "09/05/2026"
        },
        {
            title: "Data Analyst",
            description: "Análisis de grandes volúmenes de datos para la toma de decisiones estratégicas. Experiencia en SQL y visualización de datos.",
            location: "Buenos Aires, Argentina",
            modality: "Hybrid",
            creationDate: "08/05/2026"
        },
        {
            title: "Mobile Developer (React Native)",
            description: "Desarrollo de aplicaciones multiplataforma con alto rendimiento. Experiencia en publicación en App Store y Google Play.",
            location: "Santa Rosa, La Pampa",
            modality: "Remote",
            creationDate: "08/05/2026"
        },
        {
            title: "DevOps Engineer",
            description: "Administración de infraestructura en AWS. Foco en seguridad, escalabilidad y automatización de despliegues.",
            location: "Buenos Aires, Argentina",
            modality: "Full Time",
            creationDate: "07/05/2026"
        },
        {
            title: "Project Manager IT",
            description: "Gestión de equipos técnicos bajo metodologías Scrum. Seguimiento de objetivos y facilitación de ceremonias.",
            location: "Córdoba, Argentina",
            modality: "Hybrid",
            creationDate: "06/05/2026"
        },
        {
            title: "Cybersecurity Specialist",
            description: "Protección de activos digitales y auditorías preventivas. Conocimiento profundo de protocolos de red y firewalls.",
            location: "Buenos Aires, Argentina",
            modality: "Remote",
            creationDate: "05/05/2026"
        },
        {
            title: "Technical Recruiter",
            description: "Búsqueda activa de talento IT. Entrevistas de filtrado técnico y acompañamiento en el proceso de Onboarding.",
            location: "Buenos Aires, Argentina",
            modality: "Part Time",
            creationDate: "04/05/2026"
        }
    ];

    return (
        <Container>
            <Box sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "50px",
                marginBottom: "50px"
            }}>
                <Box sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    p: 2,
                    bgcolor: "primary.main",
                    color: "white",
                    borderRadius: "50%"
                }}>
                    <Briefcase size={40} />
                </Box>
                <Typography variant="h1">Portal de Empleo</Typography>
                <Typography variant="body1">Descubre oportunidades que se ajusten a tu perfil</Typography>
            </Box>
            <Card sx={{ p: 2 }}>
                <TextField
                    fullWidth
                    placeholder="Buscar por título o área..."
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={18} color="#94a3b8" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            </Card>
            <Box sx={{
                margin: "50px"
            }}>
                <Stack spacing={3}>
                    {JOBS_DATA.map((job, index) => (
                        <JobCard
                            key={index}
                            job={job}
                        />
                    ))}
                </Stack>
            </Box>
        </Container>
    );
}