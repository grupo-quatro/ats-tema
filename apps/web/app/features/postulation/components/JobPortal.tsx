"use client"

import { Container, Box, Typography, Card, TextField, InputAdornment } from "@mui/material";
import { Briefcase, Search } from "lucide-react";
import JobCard from "./JobCard";

export default function JobPortal() {
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
                <>
                    <JobCard
                        title="Backend Developer Node.js"
                        description="Sumate para escalar microservicios y optimizar bases de datos en MongoDB. Valoramos conocimientos en arquitecturas limpias."
                        location="Córdoba, Argentina"
                        modality="Remote"
                        creationDate="12/05/2026"
                    />

                    <JobCard
                        title="UX/UI Designer"
                        description="Diseñá interfaces modernas y funcionales. Trabajo codo a codo con el equipo de front para asegurar la fidelidad de los mockups de Figma."
                        location="Rosario, Argentina"
                        modality="Hybrid"
                        creationDate="11/05/2026"
                    />

                    <JobCard
                        title="Fullstack Developer (React/Python)"
                        description="Buscamos un perfil versátil que pueda manejar el frontend en React y servicios de inteligencia artificial en Python."
                        location="Buenos Aires, Argentina"
                        modality="Remote"
                        creationDate="10/05/2026"
                    />

                    <JobCard
                        title="QA Automation Engineer"
                        description="Responsable de asegurar la calidad mediante tests automatizados (Cypress/Playwright). Implementación de CI/CD."
                        location="Mendoza, Argentina"
                        modality="Full Time"
                        creationDate="09/05/2026"
                    />

                    <JobCard
                        title="Data Analyst"
                        description="Análisis de grandes volúmenes de datos para la toma de decisiones estratégicas. Experiencia en SQL y visualización de datos."
                        location="Buenos Aires, Argentina"
                        modality="Hybrid"
                        creationDate="08/05/2026"
                    />

                    <JobCard
                        title="Mobile Developer (React Native)"
                        description="Desarrollo de aplicaciones multiplataforma con alto rendimiento. Experiencia en publicación en App Store y Google Play."
                        location="Santa Rosa, La Pampa"
                        modality="Remote"
                        creationDate="08/05/2026"
                    />

                    <JobCard
                        title="DevOps Engineer"
                        description="Administración de infraestructura en AWS. Foco en seguridad, escalabilidad y automatización de despliegues."
                        location="Buenos Aires, Argentina"
                        modality="Full Time"
                        creationDate="07/05/2026"
                    />

                    <JobCard
                        title="Project Manager IT"
                        description="Gestión de equipos técnicos bajo metodologías Scrum. Seguimiento de objetivos y facilitación de ceremonias."
                        location="Córdoba, Argentina"
                        modality="Hybrid"
                        creationDate="06/05/2026"
                    />

                    <JobCard
                        title="Cybersecurity Specialist"
                        description="Protección de activos digitales y auditorías preventivas. Conocimiento profundo de protocolos de red y firewalls."
                        location="Buenos Aires, Argentina"
                        modality="Remote"
                        creationDate="05/05/2026"
                    />

                    <JobCard
                        title="Technical Recruiter"
                        description="Búsqueda activa de talento IT. Entrevistas de filtrado técnico y acompañamiento en el proceso de Onboarding."
                        location="Buenos Aires, Argentina"
                        modality="Part Time"
                        creationDate="04/05/2026"
                    />
                </>
            </Box>
        </Container>
    );
}