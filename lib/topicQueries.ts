export type TopicQuery = {
  topic: string;
  query: string;
};

export const topicQueries: TopicQuery[] = [
  {
    topic: "Semiconductor",
    query: "semiconductor OR HBM OR memory chip OR advanced packaging",
  },
  {
    topic: "AI",
    query: "artificial intelligence OR AI infrastructure OR AI chip",
  },
  {
    topic: "Automation",
    query: "factory automation OR smart factory OR industrial automation",
  },
  {
    topic: "Robotics",
    query: "industrial robotics OR AI robotics OR warehouse robots",
  },
  {
    topic: "IT",
    query: "enterprise IT OR cybersecurity OR cloud infrastructure",
  },
];