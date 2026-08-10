import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding TalentIQ database...');

  const candidate = await prisma.candidate.upsert({
    where: { email: 'alice@talentiq.ai' },
    update: {},
    create: {
      email: 'alice@talentiq.ai',
      fullName: 'Alice Walker',
      title: 'Senior Full Stack Engineer',
      skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
      summary: 'Experienced full stack developer with 6+ years in web development.',
    },
  });

  const job = await prisma.jobPosting.create({
    data: {
      title: 'Staff Software Engineer',
      company: 'TechCorp Solutions',
      location: 'Remote',
      requirements: ['TypeScript', 'Node.js', 'System Design'],
    },
  });

  await prisma.interview.create({
    data: {
      candidateId: candidate.id,
      jobId: job.id,
      score: 92.5,
      status: 'COMPLETED',
    },
  });

  console.log('Seeding complete for TalentIQ.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
