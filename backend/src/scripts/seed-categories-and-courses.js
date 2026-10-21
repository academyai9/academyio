const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://sonusaini@127.0.0.1:5432/academyio_medusa';

const OFFICIAL_CATEGORIES = [
  {
    id: 'pcat_accounting',
    name: 'Accounting',
    handle: 'accounting',
    description: 'Explore accounting principles, financial reporting, bookkeeping, auditing, and professional accounting education.',
    rank: 0,
    metadata: {
      icon: 'Calculator',
      color: 'blue',
      badge: 'CPE Accredited',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    },
  },
  {
    id: 'pcat_healthcare',
    name: 'Healthcare',
    handle: 'healthcare',
    description: 'Learn about healthcare administration, compliance, regulations, healthcare operations, and professional development.',
    rank: 1,
    metadata: {
      icon: 'HeartPulse',
      color: 'emerald',
      badge: 'Regulatory & Compliance',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    },
  },
  {
    id: 'pcat_housing',
    name: 'Housing',
    handle: 'housing',
    description: 'Explore housing regulations, property management, real estate compliance, housing programs, and related professional education.',
    rank: 2,
    metadata: {
      icon: 'Building2',
      color: 'amber',
      badge: 'Property & Section 42',
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    },
  },
  {
    id: 'pcat_hr_payroll',
    name: 'Human Resources & Payroll',
    handle: 'human-resources-payroll',
    description: 'Learn about HR management, payroll processing, employment law, workplace policies, employee benefits, and compliance.',
    rank: 3,
    metadata: {
      icon: 'Users',
      color: 'purple',
      badge: 'Workforce & Labor Law',
      image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=800&q=80',
    },
  },
  {
    id: 'pcat_taxation',
    name: 'Taxation',
    handle: 'taxation',
    description: 'Explore tax preparation, tax planning, IRS regulations, tax compliance, forms, deductions, and tax law updates.',
    rank: 4,
    metadata: {
      icon: 'Landmark',
      color: 'indigo',
      badge: 'IRS Forms & Codes',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    },
  },
  {
    id: 'pcat_technology',
    name: 'Technology',
    handle: 'technology',
    description: 'Discover AI tools, software, cybersecurity, data analytics, automation, and technology solutions for professionals.',
    rank: 5,
    metadata: {
      icon: 'Cpu',
      color: 'cyan',
      badge: 'AI & Cybersecurity',
      image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
    },
  },
];

const NEW_SPEAKERS = [
  {
    id: 'spk_sarah_jenkins',
    name: 'Sarah Jenkins, JD, CHC',
    slug: 'sarah-jenkins',
    bio: 'Sarah Jenkins is a healthcare regulatory attorney with over 20 years of experience counseling health systems, physician practices, and medical billing organizations on HIPAA security, OIG fraud, and Stark Law compliance.',
    designation: 'Healthcare Compliance Counsel & Former Regulatory Auditor',
    qualifications: 'JD, CHC (Certified in Healthcare Compliance)',
    photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    email: 'sjenkins@academyio.com',
    status: 'active',
  },
  {
    id: 'spk_marcus_vance',
    name: 'Marcus Vance, CPA',
    slug: 'marcus-vance',
    bio: 'Marcus Vance specializes in affordable housing finance and Low-Income Housing Tax Credit (LIHTC) compliance under IRC Section 42. He consults for top real estate syndicators and state housing authorities.',
    designation: 'Affordable Housing & Real Estate Tax Advisory Partner',
    qualifications: 'CPA, National LIHTC Compliance Specialist',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    email: 'mvance@academyio.com',
    status: 'active',
  },
  {
    id: 'spk_elena_rostova',
    name: 'Elena Rostova, CPP, SHRM-SCP',
    slug: 'elena-rostova',
    bio: 'Elena Rostova is a recognized authority on multi-state employment tax, remote worker withholding, wage & hour laws, and compensation compliance. She has managed complex payroll infrastructure for Fortune 500 corporations.',
    designation: 'Managing Director of Workforce Compliance & Payroll',
    qualifications: 'CPP (Certified Payroll Professional), SHRM-SCP',
    photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
    email: 'erostova@academyio.com',
    status: 'active',
  },
];

const ADDITIONAL_WEBINARS = [
  {
    id: 'web_healthcare_hipaa_2026',
    title: 'Healthcare Compliance & HIPAA Security Rule: 2026 Regulatory Enforcement & Audit Defense',
    slug: 'healthcare-compliance-hipaa-security-rule-2026',
    short_description: 'Critical review of HHS OCR HIPAA enforcement priorities, patient privacy compliance, business associate agreements, and cybersecurity risk assessments.',
    description: '<p>Healthcare organizations, covered entities, and business associates face stringent regulatory enforcement in 2026. This comprehensive masterclass delivers practical guidance on HIPAA Security Rule requirements, OCR audit protocols, breach notification timelines, and risk mitigation strategies.</p>',
    featured_image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
    speaker_id: 'spk_sarah_jenkins',
    speaker_name: 'Sarah Jenkins, JD, CHC',
    speaker_title: 'Healthcare Compliance Counsel & Former Regulatory Auditor',
    speaker_bio: 'Sarah Jenkins is a healthcare regulatory attorney with over 20 years of experience counseling health systems and physician practices.',
    speaker_photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    event_date: '2026-11-24T18:00:00.000Z',
    start_time: '1:00 PM EST',
    end_time: '2:40 PM EST',
    timezone: 'America/New_York',
    duration_minutes: 100,
    category: 'Healthcare',
    tags: ['Healthcare', 'HIPAA', 'Compliance', 'OCR Audits', 'Patient Privacy'],
    learning_objectives: [
      'Analyze the latest 2026 HHS OCR enforcement directives and settlement penalties.',
      'Construct compliant Business Associate Agreements (BAAs) that address modern cloud data flows.',
      'Implement mandated administrative, physical, and technical safeguards under the Security Rule.',
      'Execute a legally defensible breach assessment within the 60-day notification timeline.'
    ],
    target_audience: 'Healthcare Administrators, Compliance Officers, Practice Managers, Health Law Counsel',
    cpe_credits: 2,
    status: 'published',
    is_featured: true,
    is_upcoming: true,
    is_ondemand: false,
    live_stream_url: 'https://zoom.us/j/91823746102?pwd=HealthcareCompliance2026',
    live_instructions: 'Join 10 minutes before start. Interactive Q&A will be open throughout.',
    live_link_published: true,
    product_id: 'prod_healthcare_hipaa_2026',
    prices: { live: 149, recording: 149, transcript: 49, pdf: 29, bundle: 249 },
  },
  {
    id: 'web_housing_lihtc_2026',
    title: 'Affordable Housing & LIHTC Compliance: Section 42 Regulations, Tenant File Audits & IRS Form 8823',
    slug: 'affordable-housing-lihtc-compliance-section-42',
    short_description: 'Master Low-Income Housing Tax Credit (LIHTC) compliance, income qualification calculations, student rules, and IRS noncompliance defense under Section 42.',
    description: '<p>Navigating Low-Income Housing Tax Credit (LIHTC) compliance requires precision in understanding IRS Section 42 rules, state allocating agency standards, and HUD income limits. This intensive session equips housing managers, property accountants, and compliance auditors with the tools to prevent costly credit recapture.</p>',
    featured_image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
    speaker_id: 'spk_marcus_vance',
    speaker_name: 'Marcus Vance, CPA',
    speaker_title: 'Affordable Housing & Real Estate Tax Advisory Partner',
    speaker_bio: 'Marcus Vance specializes in affordable housing finance and Low-Income Housing Tax Credit (LIHTC) compliance under IRC Section 42.',
    speaker_photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    event_date: '2026-12-08T19:00:00.000Z',
    start_time: '2:00 PM EST',
    end_time: '3:40 PM EST',
    timezone: 'America/New_York',
    duration_minutes: 100,
    category: 'Housing',
    tags: ['Affordable Housing', 'LIHTC', 'Section 42', 'Property Management', 'Form 8823'],
    learning_objectives: [
      'Calculate tenant household income accurately using the revised HUD Handbook 4350.3 standards.',
      'Identify critical triggers for IRS Form 8823 noncompliance notifications and cure periods.',
      'Apply the Available Unit Rule and Vacant Unit Rule to preserve building tax credit allocations.',
      'Audit tenant recertification packages and utility allowance adjustments.'
    ],
    target_audience: 'Property Managers, LIHTC Compliance Specialists, Real Estate Asset Managers, CPAs',
    cpe_credits: 2,
    status: 'published',
    is_featured: true,
    is_upcoming: true,
    is_ondemand: false,
    live_stream_url: 'https://zoom.us/j/92837461520?pwd=AffordableHousingLIHTC2026',
    live_instructions: 'Session materials and HUD calculation spreadsheets available upon logging in.',
    live_link_published: true,
    product_id: 'prod_housing_lihtc_2026',
    prices: { live: 149, recording: 149, transcript: 49, pdf: 29, bundle: 249 },
  },
  {
    id: 'web_hr_multistate_payroll_2026',
    title: 'Multi-State Payroll Tax Compliance & FLSA Overtime Rules: 2026 Federal & State Standards',
    slug: 'multistate-payroll-tax-compliance-flsa-overtime-2026',
    short_description: 'Essential updates on remote employee withholding, nexus thresholds, FLSA salary exempt tests, employee classification, and payroll year-end filings.',
    description: '<p>Managing payroll across multiple jurisdictions has become a primary compliance vulnerability for businesses of all sizes. This course explores remote worker state income tax withholding, reciprocity agreements, local payroll taxes, independent contractor classification vs W-2 employees, and Fair Labor Standards Act (FLSA) salary thresholds.</p>',
    featured_image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80',
    speaker_id: 'spk_elena_rostova',
    speaker_name: 'Elena Rostova, CPP, SHRM-SCP',
    speaker_title: 'Managing Director of Workforce Compliance & Payroll',
    speaker_bio: 'Elena Rostova is a recognized authority on multi-state employment tax, remote worker withholding, wage & hour laws, and compensation compliance.',
    speaker_photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
    event_date: '2026-11-19T18:00:00.000Z',
    start_time: '1:00 PM EST',
    end_time: '3:30 PM EST',
    timezone: 'America/New_York',
    duration_minutes: 150,
    category: 'Human Resources & Payroll',
    tags: ['Payroll', 'Human Resources', 'FLSA', 'Multi-State Tax', 'Wage & Hour'],
    learning_objectives: [
      'Determine correct state withholding requirements for mobile and remote hybrid employees.',
      'Evaluate independent contractor status under updated Department of Labor economic reality tests.',
      'Calculate regular rate of pay for non-exempt employees receiving bonuses and shift differentials.',
      'Structure compliant paid leave policies and taxable fringe benefit reporting.'
    ],
    target_audience: 'Payroll Directors, HR Managers, Controllers, Compensation Analysts, CPAs',
    cpe_credits: 3,
    status: 'published',
    is_featured: true,
    is_upcoming: true,
    is_ondemand: false,
    live_stream_url: 'https://zoom.us/j/93847562019?pwd=MultiStatePayrollHR2026',
    live_instructions: 'Download the multi-state payroll nexus matrix before session start.',
    live_link_published: true,
    product_id: 'prod_hr_multistate_payroll_2026',
    prices: { live: 149, recording: 149, transcript: 49, pdf: 29, bundle: 249 },
  },
  {
    id: 'web_accounting_forensic_fraud_2026',
    title: 'Forensic Accounting & Corporate Fraud Investigation: Detection Strategies & Evidence Collection',
    slug: 'forensic-accounting-fraud-investigation-strategies',
    short_description: 'Practical techniques for uncovering occupational fraud, financial statement manipulation, asset misappropriation, and maintaining chain of custody.',
    description: '<p>Forensic accountants are essential for discovering hidden fraud patterns and establishing litigation-grade findings. This masterclass examines the Fraud Triangle, red flags in vendor disbursements, shell company identification, and effective investigative interview methods.</p>',
    featured_image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
    speaker_id: 'spk_jennifer_louis',
    speaker_name: 'Jennifer Louis, CPA',
    speaker_title: 'President of Emeritus Consulting Services, Former Deloitte Audit Manager',
    speaker_bio: 'Jennifer Louis has over 25 years of experience in auditing, internal controls, and forensic accounting investigation.',
    speaker_photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
    event_date: '2026-10-18T18:00:00.000Z',
    start_time: '1:00 PM EST',
    end_time: '2:40 PM EST',
    timezone: 'America/New_York',
    duration_minutes: 100,
    category: 'Accounting',
    tags: ['Forensic Accounting', 'Fraud Investigation', 'Internal Controls', 'Auditing', 'Self-Study'],
    learning_objectives: [
      'Identify anomalous transaction patterns and Benford Law statistical anomalies in journal entries.',
      'Investigate shell vendor schemes, ghost employees, and billing irregularities.',
      'Document evidence following legal standards for admissibility in civil and criminal litigation.',
      'Conduct effective fraud interviews without compromising investigator objectivity.'
    ],
    target_audience: 'Forensic Accountants, Internal Auditors, CPAs, Financial Controllers',
    cpe_credits: 2,
    status: 'published',
    is_featured: true,
    is_upcoming: false,
    is_ondemand: true,
    recording_url: 'https://customer-assets.academyio.com/recordings/forensic-accounting-masterclass.mp4',
    recording_instructions: 'Available 24/7 in your customer dashboard with downloadable slides and study guide.',
    recording_published: true,
    product_id: 'prod_accounting_forensic_fraud_2026',
    prices: { live: 149, recording: 149, transcript: 49, pdf: 29, bundle: 249 },
  },
  {
    id: 'web_technology_cybersecurity_cloud_2026',
    title: 'Cybersecurity Compliance & Cloud Controls for Financial Systems: SOC 2 & NIST Frameworks',
    slug: 'cybersecurity-cloud-controls-soc2-nist-finance',
    short_description: 'Comprehensive guide to implementing SOC 2 Trust Services Criteria, NIST cybersecurity frameworks, and safeguarding financial data in cloud environments.',
    description: '<p>Financial institutions and accounting firms handle high-value sensitive financial data making them prime targets for cyber threats. This session provides actionable frameworks for cloud security architecture, access controls, third-party vendor risk assessments, and incident response readiness.</p>',
    featured_image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    speaker_id: 'spk_amanda_chen',
    speaker_name: 'Dr. Amanda Chen, Ph.D., CPA, CFE',
    speaker_title: 'Professor of Accounting Information Systems & Forensic Auditing',
    speaker_bio: 'Dr. Chen is an authority on algorithmic audit procedures, fraud analytics, and technology governance.',
    speaker_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    event_date: '2026-10-25T18:00:00.000Z',
    start_time: '1:00 PM EST',
    end_time: '2:40 PM EST',
    timezone: 'America/New_York',
    duration_minutes: 100,
    category: 'Technology',
    tags: ['Cybersecurity', 'Cloud Security', 'SOC 2', 'NIST', 'Technology', 'Self-Study'],
    learning_objectives: [
      'Design SOC 2 Type II audit readiness programs for cloud financial systems.',
      'Implement zero-trust network architectures and cryptographic data protection standards.',
      'Assess third-party vendor risk and cloud shared responsibility models.',
      'Formulate incident response plans meeting regulatory notification deadlines.'
    ],
    target_audience: 'IT Auditors, Chief Information Security Officers, CPAs, Technology Directors',
    cpe_credits: 2,
    status: 'published',
    is_featured: true,
    is_upcoming: false,
    is_ondemand: true,
    recording_url: 'https://customer-assets.academyio.com/recordings/cybersecurity-cloud-controls-masterclass.mp4',
    recording_instructions: 'Watch instantly on-demand. Includes downloadable NIST security matrices and audit checklists.',
    recording_published: true,
    product_id: 'prod_technology_cybersecurity_cloud_2026',
    prices: { live: 149, recording: 149, transcript: 49, pdf: 29, bundle: 249 },
  },
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to PostgreSQL database:', DATABASE_URL);

  try {
    await client.query('BEGIN');

    // 1. Remove old demo categories from product_category_product & product_category
    console.log('Removing old demo categories (Shirts, Pants, etc.)...');
    const oldDemoIds = [
      'pcat_01M4N9BBA1B7Y6SGE7R08CCV78',
      'pcat_01M4N9BBA1T12Z3SV6TVJRK87J',
      'pcat_01M4N9BBA2HR1P5C0YHT0KBENP',
      'pcat_01M4N9BBA2NMDY7YZVCXDREM8X',
    ];
    await client.query(`
      DELETE FROM product_category_product WHERE product_category_id = ANY($1)
    `, [oldDemoIds]);

    await client.query(`
      DELETE FROM product_category WHERE id = ANY($1)
    `, [oldDemoIds]);

    // 2. Upsert the 6 Official Categories
    console.log('Upserting the 6 Official Categories...');
    for (const cat of OFFICIAL_CATEGORIES) {
      const existing = await client.query('SELECT id FROM product_category WHERE id = $1 OR handle = $2', [cat.id, cat.handle]);
      if (existing.rows.length > 0) {
        await client.query(`
          UPDATE product_category
          SET name = $1, description = $2, handle = $3, rank = $4, is_active = true, metadata = $5, updated_at = NOW()
          WHERE id = $6
        `, [cat.name, cat.description, cat.handle, cat.rank, JSON.stringify(cat.metadata), existing.rows[0].id]);
        console.log(`Updated category: ${cat.name}`);
      } else {
        await client.query(`
          INSERT INTO product_category (id, name, description, handle, mpath, is_active, is_internal, rank, created_at, updated_at, metadata)
          VALUES ($1, $2, $3, $4, $5, true, false, $6, NOW(), NOW(), $7)
        `, [cat.id, cat.name, cat.description, cat.handle, cat.id, cat.rank, JSON.stringify(cat.metadata)]);
        console.log(`Inserted category: ${cat.name}`);
      }
    }

    // 3. Update existing webinars to align with the 6 official category names
    console.log('Aligning existing webinar categories...');
    await client.query(`
      UPDATE webinar
      SET category = 'Accounting'
      WHERE category IN ('Auditing & Accounting')
    `);
    await client.query(`
      UPDATE webinar
      SET category = 'Technology'
      WHERE category IN ('Emerging Technology & Audit')
    `);
    await client.query(`
      UPDATE webinar
      SET category = 'Taxation'
      WHERE category IN ('Federal Taxation', 'Corporate Tax', 'Tax & Accounting', 'Estate & Financial Planning')
    `);

    // 4. Upsert New Faculty Speakers
    console.log('Upserting Faculty Speakers...');
    for (const spk of NEW_SPEAKERS) {
      const existing = await client.query('SELECT id FROM speaker WHERE id = $1', [spk.id]);
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO speaker (id, name, slug, bio, designation, qualifications, photo_url, email, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `, [spk.id, spk.name, spk.slug, spk.bio, spk.designation, spk.qualifications, spk.photo_url, spk.email, spk.status]);
        console.log(`Inserted speaker: ${spk.name}`);
      }
    }

    // 5. Insert Additional Real Webinars for Healthcare, Housing, HR & Payroll, Accounting, Technology
    console.log('Adding rich webinars for all 6 categories...');
    for (const item of ADDITIONAL_WEBINARS) {
      const existingWeb = await client.query('SELECT id FROM webinar WHERE slug = $1', [item.slug]);
      let webId = item.id;
      if (existingWeb.rows.length > 0) {
        webId = existingWeb.rows[0].id;
        await client.query(`
          UPDATE webinar
          SET title = $1, short_description = $2, description = $3, featured_image = $4,
              speaker_id = $5, speaker_name = $6, speaker_title = $7, speaker_bio = $8, speaker_photo = $9,
              event_date = $10, start_time = $11, end_time = $12, timezone = $13, duration_minutes = $14,
              category = $15, tags = $16, learning_objectives = $17, target_audience = $18, cpe_credits = $19,
              status = $20, is_featured = $21, is_upcoming = $22, is_ondemand = $23,
              live_stream_url = $24, live_instructions = $25, live_link_published = $26,
              recording_url = $27, recording_published = $28, updated_at = NOW()
          WHERE id = $29
        `, [
          item.title, item.short_description, item.description, item.featured_image,
          item.speaker_id, item.speaker_name, item.speaker_title, item.speaker_bio, item.speaker_photo,
          item.event_date, item.start_time, item.end_time, item.timezone, item.duration_minutes,
          item.category, JSON.stringify(item.tags), JSON.stringify(item.learning_objectives), item.target_audience, item.cpe_credits,
          item.status, item.is_featured, item.is_upcoming, item.is_ondemand,
          item.live_stream_url || null, item.live_instructions || null, item.live_link_published || false,
          item.recording_url || null, item.recording_published || false, webId
        ]);
        console.log(`Updated existing webinar: ${item.title}`);
      } else {
        await client.query(`
          INSERT INTO webinar (
            id, title, slug, short_description, description, featured_image,
            speaker_id, speaker_name, speaker_title, speaker_bio, speaker_photo,
            event_date, start_time, end_time, timezone, duration_minutes,
            category, tags, learning_objectives, target_audience, cpe_credits,
            status, is_featured, is_upcoming, is_ondemand, is_seminar,
            live_stream_url, live_instructions, live_link_published,
            recording_url, recording_published, product_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21,
            $22, $23, $24, $25, false,
            $26, $27, $28,
            $29, $30, $31, NOW(), NOW()
          )
        `, [
          webId, item.title, item.slug, item.short_description, item.description, item.featured_image,
          item.speaker_id, item.speaker_name, item.speaker_title, item.speaker_bio, item.speaker_photo,
          item.event_date, item.start_time, item.end_time, item.timezone, item.duration_minutes,
          item.category, JSON.stringify(item.tags), JSON.stringify(item.learning_objectives), item.target_audience, item.cpe_credits,
          item.status, item.is_featured, item.is_upcoming, item.is_ondemand,
          item.live_stream_url || null, item.live_instructions || null, item.live_link_published || false,
          item.recording_url || null, item.recording_published || false, item.product_id
        ]);
        console.log(`Inserted webinar: ${item.title}`);
      }

      // Upsert Product in product table
      const existingProd = await client.query('SELECT id FROM product WHERE id = $1 OR handle = $2', [item.product_id, item.slug]);
      let prodId = item.product_id;
      if (existingProd.rows.length === 0) {
        await client.query(`
          INSERT INTO product (id, title, handle, description, status, thumbnail, discountable, is_giftcard, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 'published', $5, true, false, NOW(), NOW())
        `, [prodId, item.title, item.slug, item.short_description, item.featured_image]);
        console.log(`Inserted product for: ${item.title}`);
      } else {
        prodId = existingProd.rows[0].id;
      }

      // Map product to product_category
      const pcatMap = {
        'Accounting': 'pcat_accounting',
        'Healthcare': 'pcat_healthcare',
        'Housing': 'pcat_housing',
        'Human Resources & Payroll': 'pcat_hr_payroll',
        'Taxation': 'pcat_taxation',
        'Technology': 'pcat_technology',
      };
      const catId = pcatMap[item.category];
      if (catId) {
        const catProdExists = await client.query(
          'SELECT product_id FROM product_category_product WHERE product_id = $1 AND product_category_id = $2',
          [prodId, catId]
        );
        if (catProdExists.rows.length === 0) {
          await client.query(
            'INSERT INTO product_category_product (product_id, product_category_id) VALUES ($1, $2)',
            [prodId, catId]
          );
          console.log(`Linked product ${prodId} to category ${catId}`);
        }
      }

      // Ensure variant mappings exist for options
      const existingMappings = await client.query('SELECT id FROM webinar_variant_mapping WHERE webinar_id = $1', [webId]);
      if (existingMappings.rows.length === 0) {
        const variantConfigs = [
          { type: 'live', title: 'Live Webinar Access', price: 149, incLive: true, incRec: false, incTrs: false, incPdf: false, order: 1 },
          { type: 'recording', title: 'Recorded Webinar', price: 149, incLive: false, incRec: true, incTrs: false, incPdf: false, order: 2 },
          { type: 'transcript', title: 'Webinar Transcript', price: 49, incLive: false, incRec: false, incTrs: true, incPdf: false, order: 3 },
          { type: 'pdf', title: 'PDF Download', price: 29, incLive: false, incRec: false, incTrs: false, incPdf: true, order: 4 },
          { type: 'bundle', title: 'Complete Package: Live + Recording + Transcript + PDF', price: 249, incLive: true, incRec: true, incTrs: true, incPdf: true, order: 5 },
        ];
        for (const cfg of variantConfigs) {
          const varMapId = `wvm_${webId.slice(-10)}_${cfg.type}`;
          const varId = `var_${webId.slice(-10)}_${cfg.type}`;
          await client.query(`
            INSERT INTO webinar_variant_mapping (
              id, webinar_id, variant_id, option_type, title, price, currency_code,
              includes_live, includes_recording, includes_transcript, includes_pdf,
              is_enabled, order_index, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, 'usd', $7, $8, $9, $10, true, $11, NOW(), NOW()
            )
          `, [
            varMapId, webId, varId, cfg.type, cfg.title, cfg.price,
            cfg.incLive, cfg.incRec, cfg.incTrs, cfg.incPdf, cfg.order
          ]);
        }
        console.log(`Created 5 variant mappings for ${item.title}`);
      }
    }

    // 6. Link all other products to their corresponding product_category
    console.log('Linking remaining webinar products to product categories...');
    const allWebinars = await client.query('SELECT id, product_id, category FROM webinar WHERE product_id IS NOT NULL');
    const pcatMap = {
      'Accounting': 'pcat_accounting',
      'Healthcare': 'pcat_healthcare',
      'Housing': 'pcat_housing',
      'Human Resources & Payroll': 'pcat_hr_payroll',
      'Taxation': 'pcat_taxation',
      'Technology': 'pcat_technology',
    };
    for (const w of allWebinars.rows) {
      const catId = pcatMap[w.category];
      if (catId && w.product_id) {
        const catProdExists = await client.query(
          'SELECT product_id FROM product_category_product WHERE product_id = $1 AND product_category_id = $2',
          [w.product_id, catId]
        );
        if (catProdExists.rows.length === 0) {
          await client.query(
            'INSERT INTO product_category_product (product_id, product_category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [w.product_id, catId]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Categories & webinars migration successfully completed!');

    // Print summary
    const finalCats = await client.query('SELECT id, name, handle, (SELECT count(*) FROM webinar WHERE category = product_category.name) as webinar_count FROM product_category ORDER BY rank');
    console.log('Official Categories Summary:');
    console.table(finalCats.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
