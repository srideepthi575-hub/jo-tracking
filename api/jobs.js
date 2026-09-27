export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://himalayas.app/jobs/api/search?query=software%20engineer"
    );

    const data = await response.json();

    const jobs = (data.jobs || []).map((job) => ({
      id: job.id,
      title: job.title,
      company: job.companyName || job.company || "Unknown",
      location: job.location || "Remote",
      description: job.description || "",
      url: job.applicationLink || job.url,
      source: "Himalayas",
      postedAt: job.pubDate || job.createdAt || null
    }));

    return res.status(200).json({
      success: true,
      jobs
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      jobs: []
    });
  }
}
