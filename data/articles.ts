export type Article = {
  id: string;
  topic: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  originalUrl: string;
  importanceScore: number;
};

export const articles: Article[] = [
  {
    id: "hbm-demand-ai-datacenters",
    topic: "Semiconductor",
    title: "HBM Demand Rises as AI Data Centers Continue to Expand",
    summary:
      "Demand for high-bandwidth memory continues to grow as AI data centers require faster and more power-efficient memory solutions.",
    source: "Demo Semiconductor News",
    publishedAt: "2026-05-26",
    originalUrl: "https://example.com/hbm-demand",
    importanceScore: 10,
  },
  {
    id: "advanced-packaging-chiplets",
    topic: "Semiconductor",
    title: "Advanced Packaging and Chiplets Gain Momentum in AI Hardware",
    summary:
      "Chipmakers are increasing investment in advanced packaging and chiplet-based designs to improve performance, yield, and energy efficiency for AI workloads.",
    source: "Demo Chip Industry",
    publishedAt: "2026-05-26",
    originalUrl: "https://example.com/advanced-packaging",
    importanceScore: 9,
  },
  {
    id: "memory-market-recovery",
    topic: "Semiconductor",
    title: "Memory Market Recovery Strengthens on Server and AI Demand",
    summary:
      "Analysts expect memory demand to remain strong as cloud providers and AI infrastructure companies continue expanding server capacity.",
    source: "Demo Market Brief",
    publishedAt: "2026-05-25",
    originalUrl: "https://example.com/memory-market",
    importanceScore: 8,
  },
  {
    id: "ai-chip-market-growth",
    topic: "AI",
    title: "AI Chip Market Growth Accelerates Across Cloud Providers",
    summary:
      "Cloud providers are increasing investment in AI accelerators and supporting infrastructure as enterprise AI workloads expand.",
    source: "Demo AI News",
    publishedAt: "2026-05-26",
    originalUrl: "https://example.com/ai-chip-market",
    importanceScore: 9,
  },
  {
    id: "enterprise-ai-adoption",
    topic: "AI",
    title: "Enterprise AI Adoption Moves From Pilot Projects to Production",
    summary:
      "Large companies are moving AI tools into production environments, creating demand for stronger data platforms, security controls, and compute infrastructure.",
    source: "Demo Enterprise Tech",
    publishedAt: "2026-05-26",
    originalUrl: "https://example.com/enterprise-ai",
    importanceScore: 8,
  },
  {
    id: "ai-inference-costs",
    topic: "AI",
    title: "AI Inference Costs Become Key Focus for Infrastructure Teams",
    summary:
      "As AI usage scales, companies are paying closer attention to inference cost, model efficiency, and hardware utilization.",
    source: "Demo AI Infrastructure",
    publishedAt: "2026-05-25",
    originalUrl: "https://example.com/ai-inference",
    importanceScore: 7,
  },
  {
    id: "factory-automation-memory",
    topic: "Automation",
    title: "Smart Factory Automation Drives Demand for Edge Computing",
    summary:
      "Manufacturers are adopting edge computing and automation systems to improve production efficiency and real-time monitoring.",
    source: "Demo Automation News",
    publishedAt: "2026-05-26",
    originalUrl: "https://example.com/factory-automation",
    importanceScore: 8,
  },
  {
    id: "industrial-iot-analytics",
    topic: "Automation",
    title: "Industrial IoT Analytics Improve Predictive Maintenance",
    summary:
      "Factories are using sensor data and analytics platforms to detect equipment issues earlier and reduce downtime.",
    source: "Demo Manufacturing Tech",
    publishedAt: "2026-05-25",
    originalUrl: "https://example.com/industrial-iot",
    importanceScore: 7,
  },
  {
    id: "automation-supply-chain",
    topic: "Automation",
    title: "Automation Tools Help Manufacturers Respond to Supply Chain Pressure",
    summary:
      "Automation platforms are being used to improve scheduling, inventory visibility, and manufacturing flexibility.",
    source: "Demo Supply Chain Tech",
    publishedAt: "2026-05-24",
    originalUrl: "https://example.com/automation-supply-chain",
    importanceScore: 6,
  },
  {
    id: "robotics-industrial-ai",
    topic: "Robotics",
    title: "Industrial Robots Add AI Vision for Quality Inspection",
    summary:
      "Robotics companies are adding AI-powered vision systems to detect production defects and support advanced manufacturing workflows.",
    source: "Demo Robotics News",
    publishedAt: "2026-05-26",
    originalUrl: "https://example.com/robotics-ai",
    importanceScore: 8,
  },
  {
    id: "warehouse-robotics-growth",
    topic: "Robotics",
    title: "Warehouse Robotics Adoption Expands With E-Commerce Demand",
    summary:
      "Logistics operators are deploying autonomous robots to improve picking, sorting, and inventory movement in large warehouses.",
    source: "Demo Logistics Tech",
    publishedAt: "2026-05-25",
    originalUrl: "https://example.com/warehouse-robotics",
    importanceScore: 7,
  },
  {
    id: "humanoid-robotics-manufacturing",
    topic: "Robotics",
    title: "Humanoid Robotics Startups Target Manufacturing Use Cases",
    summary:
      "Robotics startups are testing humanoid systems for repetitive industrial tasks, though cost and reliability remain major challenges.",
    source: "Demo Robotics Brief",
    publishedAt: "2026-05-24",
    originalUrl: "https://example.com/humanoid-robotics",
    importanceScore: 6,
  },
  {
    id: "enterprise-it-cloud-security",
    topic: "IT",
    title: "Enterprise IT Teams Prioritize Cloud Security and Automation",
    summary:
      "IT organizations are increasing focus on cloud security, identity management, and automation to support distributed operations.",
    source: "Demo IT News",
    publishedAt: "2026-05-26",
    originalUrl: "https://example.com/it-cloud-security",
    importanceScore: 8,
  },
  {
    id: "zero-trust-it-modernization",
    topic: "IT",
    title: "Zero Trust Security Becomes Standard in IT Modernization Plans",
    summary:
      "Companies are expanding zero trust programs to protect cloud apps, remote users, and sensitive business systems.",
    source: "Demo Cyber IT",
    publishedAt: "2026-05-25",
    originalUrl: "https://example.com/zero-trust",
    importanceScore: 7,
  },
  {
    id: "it-helpdesk-ai-agents",
    topic: "IT",
    title: "AI Agents Begin Supporting Internal IT Help Desk Operations",
    summary:
      "IT teams are testing AI agents to answer common employee questions, triage tickets, and improve service desk response times.",
    source: "Demo IT Operations",
    publishedAt: "2026-05-24",
    originalUrl: "https://example.com/helpdesk-ai",
    importanceScore: 6,
  },
];