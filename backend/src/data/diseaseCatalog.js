const MEDICATION_DISCLAIMER =
  'This CareOps reference is for general educational use only. It is not a prescription and does not replace the clinical judgment of a licensed doctor or pharmacist. Medicine selection and dosage must be determined by a qualified healthcare professional based on the individual patient. Consult a doctor or pharmacist before starting, stopping, or changing any medication.';

const DISEASE_CATALOG = [
  {
    id: 'hypertension',
    order: 1,
    name: 'Hypertension (High Blood Pressure)',
    commonSymptoms:
      'Often asymptomatic ("silent"); occasionally headache, dizziness, blurred vision, nosebleeds in severe cases.',
    medicines: [
      {
        name: 'Amlodipine',
        recommendedDosage: '5 mg once daily, may increase to 10 mg',
        frequency: 'Once daily',
        usualDuration: 'Long-term / lifelong, reassessed regularly',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Losartan',
        recommendedDosage: '50 mg once daily, may increase to 100 mg',
        frequency: 'Once daily',
        usualDuration: 'Long-term / lifelong',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Hydrochlorothiazide',
        recommendedDosage: '12.5–25 mg once daily',
        frequency: 'Once daily (morning)',
        usualDuration: 'Long-term / lifelong',
        notes: 'Adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Monitor blood pressure and kidney function regularly; avoid abrupt discontinuation; ACE inhibitors/ARBs are contraindicated in pregnancy; watch for ankle swelling (amlodipine) or electrolyte imbalance (HCTZ).',
    agePatientConsiderations:
      'Elderly: start at lower doses, monitor for postural hypotension and falls. Pregnancy: avoid ACE inhibitors/ARBs; methyldopa/labetalol preferred. Renal impairment: thiazides less effective; dose adjustment needed.',
    active: true,
  },
  {
    id: 'type-2-diabetes',
    order: 2,
    name: 'Type 2 Diabetes Mellitus',
    commonSymptoms:
      'Increased thirst, frequent urination, fatigue, unexplained weight loss, blurred vision, slow-healing wounds.',
    medicines: [
      {
        name: 'Metformin',
        recommendedDosage: '500 mg twice daily with meals, may increase to 1000 mg twice daily',
        frequency: 'Twice daily',
        usualDuration: 'Long-term / lifelong',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Glimepiride',
        recommendedDosage: '1–2 mg once daily before breakfast',
        frequency: 'Once daily',
        usualDuration: 'Long-term, as directed',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Sitagliptin',
        recommendedDosage: '100 mg once daily',
        frequency: 'Once daily',
        usualDuration: 'Long-term, as directed',
        notes: 'Adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Monitor blood glucose and HbA1c regularly; metformin may cause GI upset, avoid in severe renal impairment; sulfonylureas can cause hypoglycemia; hold metformin before contrast imaging/surgery.',
    agePatientConsiderations:
      'Elderly: higher hypoglycemia risk with sulfonylureas — prefer metformin/DPP-4 inhibitors. Renal impairment: adjust or avoid metformin below eGFR 30. Pregnancy: insulin is preferred; oral agents generally avoided.',
    active: true,
  },
  {
    id: 'common-cold',
    order: 3,
    name: 'Common Cold (Viral Upper Respiratory Infection)',
    commonSymptoms:
      'Runny/stuffy nose, sneezing, sore throat, mild cough, low-grade fever, malaise.',
    medicines: [
      {
        name: 'Paracetamol (Acetaminophen)',
        recommendedDosage: '500–650 mg every 4–6 hours as needed (max 3000–4000 mg/day)',
        frequency: 'Every 4–6 hours PRN',
        usualDuration: '3–5 days or until symptoms resolve',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Cetirizine',
        recommendedDosage: '10 mg once daily',
        frequency: 'Once daily',
        usualDuration: '5–7 days',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Saline nasal spray/drops',
        recommendedDosage: '1–2 sprays each nostril as needed',
        frequency: 'As needed',
        usualDuration: 'Until symptoms resolve',
        notes: 'Adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Antibiotics are NOT effective (viral cause); avoid exceeding paracetamol maximum daily dose (risk of liver damage); use decongestants cautiously in hypertension.',
    agePatientConsiderations:
      'Children: use pediatric weight-based paracetamol dosing; avoid cough/cold combination products under age 6. Elderly: caution with sedating antihistamines (fall risk).',
    active: true,
  },
  {
    id: 'influenza',
    order: 4,
    name: 'Influenza (Flu)',
    commonSymptoms:
      'Sudden high fever, chills, body aches, headache, fatigue, dry cough, sore throat.',
    medicines: [
      {
        name: 'Oseltamivir',
        recommendedDosage: '75 mg twice daily (started within 48 hours of symptom onset)',
        frequency: 'Twice daily',
        usualDuration: '5 days',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Paracetamol',
        recommendedDosage: '500–650 mg every 4–6 hours as needed',
        frequency: 'Every 4–6 hours PRN',
        usualDuration: 'Until fever resolves',
        notes: 'Adult, general guideline',
      },
    ],
    precautionsWarnings:
      "Antivirals are most effective within 48 hours of symptom onset; avoid aspirin in children/teens (risk of Reye's syndrome); seek care if breathing difficulty or high persistent fever occurs.",
    agePatientConsiderations:
      'High-risk groups (elderly, pregnant, chronic illness, young children) should seek prompt medical evaluation. Renal impairment: oseltamivir dose adjustment required.',
    active: true,
  },
  {
    id: 'strep-throat',
    order: 5,
    name: 'Streptococcal Pharyngitis (Strep Throat)',
    commonSymptoms:
      'Sudden sore throat, painful swallowing, fever, red/swollen tonsils with white patches, swollen neck lymph nodes.',
    medicines: [
      {
        name: 'Amoxicillin',
        recommendedDosage: '500 mg three times daily (or 875 mg twice daily)',
        frequency: '2–3 times daily',
        usualDuration: '10 days',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Penicillin V',
        recommendedDosage: '500 mg twice or three times daily',
        frequency: '2–3 times daily',
        usualDuration: '10 days',
        notes: 'If amoxicillin unavailable; adult, general guideline',
      },
      {
        name: 'Paracetamol',
        recommendedDosage: '500–650 mg every 4–6 hours as needed',
        frequency: 'Every 4–6 hours PRN',
        usualDuration: 'Until pain/fever resolves',
        notes: 'Adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Confirm with throat swab/rapid strep test when possible; complete the full antibiotic course to prevent complications (e.g., rheumatic fever); use alternative antibiotic (e.g., a macrolide) if penicillin allergy.',
    agePatientConsiderations:
      'Children: weight-based amoxicillin dosing. Penicillin allergy: substitute azithromycin or a cephalosporin per allergy severity.',
    active: true,
  },
  {
    id: 'uti',
    order: 6,
    name: 'Urinary Tract Infection (Uncomplicated, Adult Female)',
    commonSymptoms:
      'Burning on urination, urinary frequency/urgency, lower abdominal pain, cloudy or strong-smelling urine.',
    medicines: [
      {
        name: 'Nitrofurantoin',
        recommendedDosage: '100 mg twice daily',
        frequency: 'Twice daily',
        usualDuration: '5 days',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Trimethoprim-Sulfamethoxazole',
        recommendedDosage: '160/800 mg twice daily',
        frequency: 'Twice daily',
        usualDuration: '3 days',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Phenazopyridine',
        recommendedDosage: '200 mg three times daily after meals',
        frequency: 'Three times daily',
        usualDuration: 'Max 2 days',
        notes: 'Symptomatic relief; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Avoid nitrofurantoin in significant renal impairment or near term pregnancy; avoid trimethoprim-sulfamethoxazole in the first trimester of pregnancy and in sulfa allergy; seek care promptly if fever/flank pain suggests kidney involvement.',
    agePatientConsiderations:
      'Pregnancy: antibiotic choice must be reviewed by an obstetric provider. Men and recurrent/complicated UTIs generally require further evaluation, not standard short-course therapy.',
    active: true,
  },
  {
    id: 'acute-gastroenteritis',
    order: 7,
    name: 'Acute Gastroenteritis',
    commonSymptoms:
      'Diarrhea, nausea, vomiting, abdominal cramps, low-grade fever, dehydration signs (dry mouth, reduced urination).',
    medicines: [
      {
        name: 'Oral Rehydration Solution (ORS)',
        recommendedDosage: '200–400 mL after each loose stool (adult)',
        frequency: 'After each loose stool',
        usualDuration: 'Until symptoms/dehydration resolve',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Zinc sulfate',
        recommendedDosage: '10–20 mg once daily',
        frequency: 'Once daily',
        usualDuration: '10–14 days',
        notes: 'Children adjunct; adult, general guideline',
      },
      {
        name: 'Ondansetron',
        recommendedDosage: '4 mg as needed',
        frequency: 'Every 8 hours PRN',
        usualDuration: '1–2 days',
        notes: 'For vomiting; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Antibiotics are generally not needed unless bacterial cause confirmed; avoid anti-motility agents (e.g., loperamide) if high fever or bloody stools present; rehydration is the priority.',
    agePatientConsiderations:
      'Infants/young children and elderly are at higher risk of dehydration and need close monitoring; seek urgent care for persistent vomiting, blood in stool, or signs of severe dehydration.',
    active: true,
  },
  {
    id: 'migraine',
    order: 8,
    name: 'Migraine',
    commonSymptoms:
      'Throbbing, usually one-sided headache; nausea/vomiting; sensitivity to light and sound; sometimes preceded by visual aura.',
    medicines: [
      {
        name: 'Ibuprofen',
        recommendedDosage: '400–600 mg at symptom onset, may repeat after 6–8 hours (max 2400 mg/day)',
        frequency: 'Every 6–8 hours PRN',
        usualDuration: 'As needed during attacks',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Sumatriptan',
        recommendedDosage: '50–100 mg at onset, may repeat once after 2 hours (max 200 mg/day)',
        frequency: 'As needed, max 2 doses/day',
        usualDuration: 'As needed during attacks',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Propranolol',
        recommendedDosage: '40 mg twice daily, titrated up as needed',
        frequency: 'Twice daily',
        usualDuration: 'Ongoing preventive therapy, reviewed periodically',
        notes: 'For frequent/preventive use; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Avoid triptans in uncontrolled hypertension, coronary artery disease, or during pregnancy; avoid overuse of pain relievers (risk of medication-overuse headache); NSAIDs require caution with peptic ulcer or kidney disease.',
    agePatientConsiderations:
      'Pregnancy: paracetamol is generally preferred; NSAIDs and triptans typically avoided. Children: dosing and drug choice differ significantly from adults.',
    active: true,
  },
  {
    id: 'tension-headache',
    order: 9,
    name: 'Tension-Type Headache',
    commonSymptoms:
      'Dull, pressing, band-like pain on both sides of the head; neck/shoulder muscle tightness; no nausea or aura.',
    medicines: [
      {
        name: 'Paracetamol',
        recommendedDosage: '500–1000 mg every 4–6 hours as needed (max 4000 mg/day)',
        frequency: 'Every 4–6 hours PRN',
        usualDuration: 'As needed, short-term',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Ibuprofen',
        recommendedDosage: '400 mg every 6–8 hours as needed',
        frequency: 'Every 6–8 hours PRN',
        usualDuration: 'As needed, short-term',
        notes: 'Adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Limit use to fewer than 2–3 days per week to avoid rebound headache; address underlying stress, posture, or sleep issues for frequent headaches.',
    agePatientConsiderations:
      'Chronic/frequent headaches (>15 days/month) warrant medical evaluation rather than ongoing self-medication.',
    active: true,
  },
  {
    id: 'bronchial-asthma',
    order: 10,
    name: 'Bronchial Asthma',
    commonSymptoms:
      'Wheezing, shortness of breath, chest tightness, cough (often worse at night or with exercise).',
    medicines: [
      {
        name: 'Salbutamol inhaler',
        recommendedDosage: '1–2 puffs (100 mcg/puff) as needed',
        frequency: 'As needed, up to every 4–6 hours',
        usualDuration: 'As needed for symptom relief',
        notes: 'Reliever; adult, general guideline',
      },
      {
        name: 'Budesonide inhaler',
        recommendedDosage: '200–400 mcg twice daily',
        frequency: 'Twice daily',
        usualDuration: 'Long-term, reviewed regularly',
        notes: 'Controller; adult, general guideline',
      },
      {
        name: 'Montelukast',
        recommendedDosage: '10 mg once daily at bedtime',
        frequency: 'Once daily',
        usualDuration: 'Long-term, as directed',
        notes: 'Add-on; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Overuse of reliever inhaler (>2 times/week) indicates poor control — needs medical review; ensure correct inhaler technique; watch for oral thrush with inhaled steroids (rinse mouth after use).',
    agePatientConsiderations:
      'Children: use spacer devices with inhalers for effective delivery. Pregnancy: asthma control medicines are generally continued as uncontrolled asthma poses greater risk than treatment.',
    active: true,
  },
  {
    id: 'allergic-rhinitis',
    order: 11,
    name: 'Allergic Rhinitis',
    commonSymptoms:
      'Sneezing, itchy/watery eyes, clear runny nose, nasal congestion, itchy throat, typically triggered by allergens.',
    medicines: [
      {
        name: 'Cetirizine',
        recommendedDosage: '10 mg once daily',
        frequency: 'Once daily',
        usualDuration: 'As needed / during allergy season',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Fluticasone nasal spray',
        recommendedDosage: '1–2 sprays per nostril once daily',
        frequency: 'Once daily',
        usualDuration: 'Ongoing during symptomatic periods',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Montelukast',
        recommendedDosage: '10 mg once daily',
        frequency: 'Once daily',
        usualDuration: 'As directed',
        notes: 'Add-on for persistent symptoms; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Non-sedating antihistamines are preferred over sedating ones for daytime use; nasal steroids may take several days for full effect; rinse mouth/nose as directed.',
    agePatientConsiderations:
      'Children: lower antihistamine doses based on age/weight. Elderly: caution with sedating antihistamines due to fall and confusion risk.',
    active: true,
  },
  {
    id: 'gerd',
    order: 12,
    name: 'Gastroesophageal Reflux Disease (GERD)',
    commonSymptoms:
      'Heartburn, acid regurgitation, chest discomfort after meals, sour taste, sometimes chronic cough or hoarseness.',
    medicines: [
      {
        name: 'Omeprazole',
        recommendedDosage: '20 mg once daily before breakfast',
        frequency: 'Once daily',
        usualDuration: '4–8 weeks, may extend if needed',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Famotidine',
        recommendedDosage: '20 mg twice daily',
        frequency: 'Twice daily',
        usualDuration: 'As directed',
        notes: 'H2 blocker alternative; adult, general guideline',
      },
      {
        name: 'Antacid',
        recommendedDosage: '10–20 mL as needed after meals',
        frequency: 'As needed',
        usualDuration: 'Short-term symptom relief',
        notes: 'e.g., magnesium/aluminum hydroxide; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Long-term PPI use should be periodically reviewed (risk of nutrient deficiencies, bone effects with prolonged use); avoid lying down soon after meals; weight loss and dietary triggers should be addressed.',
    agePatientConsiderations:
      'Elderly: long-term PPI use linked with increased fracture and infection risk — use lowest effective dose. Pregnancy: antacids and certain H2 blockers are generally preferred first-line.',
    active: true,
  },
  {
    id: 'peptic-ulcer-h-pylori',
    order: 13,
    name: 'Peptic Ulcer Disease (H. pylori–associated)',
    commonSymptoms:
      'Burning stomach pain (often relieved or worsened by food), bloating, nausea, in severe cases dark stools or vomiting blood.',
    medicines: [
      {
        name: 'Omeprazole',
        recommendedDosage: '20 mg twice daily',
        frequency: 'Twice daily',
        usualDuration: '14 days (as part of eradication), then continued 2–4 weeks',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Amoxicillin',
        recommendedDosage: '1000 mg twice daily',
        frequency: 'Twice daily',
        usualDuration: '14 days',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Clarithromycin',
        recommendedDosage: '500 mg twice daily',
        frequency: 'Twice daily',
        usualDuration: '14 days',
        notes: 'Adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Complete the full eradication course to prevent antibiotic resistance and relapse; avoid NSAIDs and alcohol; seek urgent care for signs of bleeding (black stools, vomiting blood).',
    agePatientConsiderations:
      'Penicillin allergy: alternative regimens (e.g., metronidazole-based) needed. Confirm eradication with follow-up testing where possible.',
    active: true,
  },
  {
    id: 'hypothyroidism',
    order: 14,
    name: 'Hypothyroidism',
    commonSymptoms:
      'Fatigue, weight gain, cold intolerance, dry skin, constipation, hair thinning, depression, slowed heart rate.',
    medicines: [
      {
        name: 'Levothyroxine',
        recommendedDosage: '25–100 mcg once daily (individualized by weight and TSH), on empty stomach',
        frequency: 'Once daily, morning, before food',
        usualDuration: 'Long-term / lifelong',
        notes: 'Adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Take on an empty stomach, 30–60 minutes before food, separate from calcium/iron supplements by several hours; requires periodic TSH monitoring for dose adjustment; do not stop abruptly.',
    agePatientConsiderations:
      'Elderly and those with heart disease: start at a lower dose and titrate slowly. Pregnancy: dose requirements typically increase — needs close monitoring.',
    active: true,
  },
  {
    id: 'hyperlipidemia',
    order: 15,
    name: 'Hyperlipidemia (High Cholesterol)',
    commonSymptoms:
      'Usually asymptomatic; identified through blood lipid testing; long-term risk factor for heart disease and stroke.',
    medicines: [
      {
        name: 'Atorvastatin',
        recommendedDosage: '10–20 mg once daily, may increase based on lipid targets',
        frequency: 'Once daily',
        usualDuration: 'Long-term / lifelong',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Rosuvastatin',
        recommendedDosage: '5–10 mg once daily',
        frequency: 'Once daily',
        usualDuration: 'Long-term / lifelong',
        notes: 'Alternative; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Monitor liver enzymes and for muscle pain/weakness (rare risk of myopathy); avoid in active liver disease and during pregnancy/breastfeeding; interacts with certain antibiotics and grapefruit juice.',
    agePatientConsiderations:
      'Elderly: monitor closely for muscle-related side effects. Pregnancy: statins are contraindicated — discontinue if pregnancy is planned or confirmed.',
    active: true,
  },
  {
    id: 'osteoarthritis',
    order: 16,
    name: 'Osteoarthritis',
    commonSymptoms:
      'Joint pain that worsens with activity, stiffness (especially after rest), reduced range of motion, occasional swelling.',
    medicines: [
      {
        name: 'Paracetamol',
        recommendedDosage: '500–1000 mg every 6–8 hours as needed',
        frequency: 'Every 6–8 hours PRN',
        usualDuration: 'As needed, long-term intermittent use',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Ibuprofen',
        recommendedDosage: '400 mg three times daily with food',
        frequency: 'Three times daily',
        usualDuration: 'Short courses as needed; review for long-term use',
        notes: 'Or other NSAID; adult, general guideline',
      },
      {
        name: 'Topical diclofenac gel',
        recommendedDosage: 'Apply to affected joint 3–4 times daily',
        frequency: '3–4 times daily',
        usualDuration: 'As needed',
        notes: 'Adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Use NSAIDs at the lowest effective dose for the shortest time (GI, kidney, and cardiovascular risks); take with food; caution in patients with peptic ulcer disease, kidney disease, or heart failure.',
    agePatientConsiderations:
      'Elderly: prefer topical NSAIDs or paracetamol first-line due to systemic NSAID risks. Kidney impairment: avoid or closely monitor NSAID use.',
    active: true,
  },
  {
    id: 'community-pneumonia',
    order: 17,
    name: 'Community-Acquired Pneumonia (Outpatient, Adult)',
    commonSymptoms:
      'Cough (often productive), fever, chills, shortness of breath, chest pain with breathing, fatigue.',
    medicines: [
      {
        name: 'Amoxicillin',
        recommendedDosage: '1000 mg three times daily',
        frequency: 'Three times daily',
        usualDuration: '5–7 days',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Azithromycin',
        recommendedDosage: '500 mg on day 1, then 250 mg once daily',
        frequency: 'Once daily',
        usualDuration: '5 days total',
        notes: 'If atypical pathogens suspected or penicillin allergy; adult, general guideline',
      },
    ],
    precautionsWarnings:
      "Seek urgent medical care for difficulty breathing, high fever, confusion, or low oxygen levels — may require hospitalization; complete the full antibiotic course; follow up if symptoms don't improve within 48–72 hours.",
    agePatientConsiderations:
      'Elderly, infants, and those with chronic illness have higher risk of complications and should be evaluated promptly by a physician rather than managed by self-medication.',
    active: true,
  },
  {
    id: 'acne',
    order: 18,
    name: 'Acne Vulgaris',
    commonSymptoms:
      'Facial/back/chest pimples, blackheads, whiteheads, in moderate-severe cases inflamed papules, pustules, or cysts.',
    medicines: [
      {
        name: 'Benzoyl Peroxide topical',
        recommendedDosage: 'Apply a thin layer once or twice daily',
        frequency: 'Once or twice daily',
        usualDuration: '8–12 weeks for initial response',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Adapalene',
        recommendedDosage: 'Apply a pea-sized amount at night',
        frequency: 'Once daily (night)',
        usualDuration: '8–12 weeks minimum',
        notes: 'Topical retinoid; adult, general guideline',
      },
      {
        name: 'Doxycycline',
        recommendedDosage: '100 mg once or twice daily',
        frequency: 'Once or twice daily',
        usualDuration: '6–12 weeks',
        notes: 'For moderate–severe inflammatory acne; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Topical retinoids increase sun sensitivity — use sunscreen; doxycycline contraindicated in pregnancy and children under 8 (affects teeth/bone); avoid combining multiple irritating topicals initially.',
    agePatientConsiderations:
      'Pregnancy: avoid retinoids and tetracyclines entirely; topical azelaic acid is a safer alternative. Adolescents: dosing and product choice should consider skin sensitivity.',
    active: true,
  },
  {
    id: 'constipation',
    order: 19,
    name: 'Constipation',
    commonSymptoms:
      'Infrequent bowel movements, hard stools, straining, sensation of incomplete evacuation, abdominal discomfort.',
    medicines: [
      {
        name: 'PEG 3350',
        recommendedDosage: '17 g dissolved in water once daily',
        frequency: 'Once daily',
        usualDuration: 'Until regular bowel movements resume; can be used short or longer term',
        notes: 'Polyethylene glycol; adult, general guideline',
      },
      {
        name: 'Docusate',
        recommendedDosage: '100 mg twice daily',
        frequency: 'Twice daily',
        usualDuration: 'Short-term use',
        notes: 'Stool softener; adult, general guideline',
      },
      {
        name: 'Bisacodyl',
        recommendedDosage: '5–10 mg at bedtime',
        frequency: 'Once daily as needed',
        usualDuration: 'Short-term use (few days)',
        notes: 'Stimulant laxative if needed; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Avoid long-term stimulant laxative use without medical advice (risk of dependency); ensure adequate fluid and fiber intake; seek evaluation if constipation is sudden, severe, or with blood in stool.',
    agePatientConsiderations:
      'Elderly: PEG is generally preferred as gentler and effective. Pregnancy: PEG and fiber supplements are generally considered first-line; stimulant laxatives used cautiously.',
    active: true,
  },
  {
    id: 'acute-fever',
    order: 20,
    name: 'Acute Fever (Undifferentiated, Adult)',
    commonSymptoms:
      'Elevated body temperature (>38°C/100.4°F), chills/rigors, sweating, headache, body aches, weakness, sometimes loss of appetite.',
    medicines: [
      {
        name: 'Paracetamol',
        recommendedDosage: '500–650 mg every 4–6 hours as needed (max 3000–4000 mg/day)',
        frequency: 'Every 4–6 hours PRN',
        usualDuration: 'Until fever resolves; investigate if >3 days',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Ibuprofen',
        recommendedDosage: '400 mg every 6–8 hours as needed with food',
        frequency: 'Every 6–8 hours PRN',
        usualDuration: 'Short-term, until fever resolves',
        notes: 'Alternative; adult, general guideline',
      },
      {
        name: 'ORS/fluids',
        recommendedDosage: 'Frequent sips, at least 2–3 L/day',
        frequency: 'Throughout the day',
        usualDuration: 'Until recovery',
        notes: 'Oral rehydration solution; adult, general guideline',
      },
    ],
    precautionsWarnings:
      "Fever lasting more than 2–3 days, very high fever (>40°C/104°F), rash, severe headache, neck stiffness, difficulty breathing, or altered consciousness needs urgent medical evaluation and testing (e.g., for malaria, dengue, typhoid) rather than continued self-medication; avoid aspirin in children/teens (Reye's syndrome risk); avoid combining paracetamol and ibuprofen products that already contain paracetamol.",
    agePatientConsiderations:
      'Children/infants: use weight-based paracetamol dosing; fever in infants under 3 months requires immediate medical evaluation. Pregnancy: paracetamol is generally preferred; avoid NSAIDs especially in third trimester. Elderly: evaluate promptly, as fever presentation can be blunted and may mask serious infection.',
    active: true,
  },
  {
    id: 'malaria',
    order: 21,
    name: 'Malaria',
    commonSymptoms:
      'Cyclical high fever with chills and rigors, sweating, headache, muscle aches, fatigue, nausea/vomiting; can progress to severe illness (confusion, jaundice, breathing difficulty) if untreated.',
    medicines: [
      {
        name: 'Artemether-Lumefantrine',
        recommendedDosage: '4 tablets (20/120 mg each) per dose, weight-based',
        frequency: 'Twice daily',
        usualDuration: '3 days (6 doses total)',
        notes: 'Uncomplicated P. falciparum, first-line; adult, general guideline',
      },
      {
        name: 'Chloroquine',
        recommendedDosage: 'Initial dose then reduced doses per weight-based regimen',
        frequency: 'Once daily per regimen',
        usualDuration: '3 days',
        notes: 'For confirmed chloroquine-sensitive P. vivax where applicable; adult, general guideline',
      },
      {
        name: 'Primaquine',
        recommendedDosage: 'As per weight-based regimen',
        frequency: 'Once daily',
        usualDuration: '14 days',
        notes: 'For P. vivax/ovale relapse prevention after G6PD testing; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Malaria MUST be confirmed by blood smear or rapid diagnostic test before treatment; treatment regimen depends on the Plasmodium species and local drug-resistance patterns; primaquine requires G6PD enzyme testing first (risk of severe hemolysis if deficient); severe/complicated malaria requires hospitalization and IV therapy — this is a medical emergency.',
    agePatientConsiderations:
      'Pregnancy: artemether-lumefantrine used with caution per trimester per doctor guidance; some antimalarials (e.g., primaquine) are contraindicated in pregnancy. Children: weight-based dosing is essential. Always managed under direct medical/hospital supervision.',
    active: true,
  },
  {
    id: 'dengue',
    order: 22,
    name: 'Dengue Fever',
    commonSymptoms:
      'Sudden high fever, severe headache, pain behind the eyes, muscle and joint pain, skin rash, mild bleeding (gums/nose), low platelet count; warning signs include severe abdominal pain, persistent vomiting, and bleeding.',
    medicines: [
      {
        name: 'Paracetamol',
        recommendedDosage: '500–650 mg every 6 hours as needed (max 3000 mg/day)',
        frequency: 'Every 6 hours PRN',
        usualDuration: 'Until fever resolves, under monitoring',
        notes: 'Adult, general guideline',
      },
      {
        name: 'ORS/IV fluids',
        recommendedDosage: 'Frequent fluids; IV fluids if unable to tolerate oral intake or hematocrit rising',
        frequency: 'Continuous, per medical guidance',
        usualDuration: 'Until recovery/stabilization',
        notes: 'As directed by doctor; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'There is NO specific antiviral treatment for dengue — care is supportive; AVOID NSAIDs (e.g., ibuprofen, aspirin) and other blood-thinning medicines due to bleeding risk; requires close monitoring of platelet count and hematocrit; warning signs require immediate hospital care — this can be a medical emergency.',
    agePatientConsiderations:
      'Children, pregnant women, infants, elderly, and those with chronic illness are at higher risk of severe dengue and should be monitored closely, generally in a hospital setting during the critical phase.',
    active: true,
  },
  {
    id: 'typhoid-fever',
    order: 23,
    name: 'Typhoid Fever',
    commonSymptoms:
      'Sustained high (step-ladder pattern) fever, headache, abdominal pain, constipation or diarrhea, weakness, loss of appetite, sometimes rose-colored rash.',
    medicines: [
      {
        name: 'Ceftriaxone',
        recommendedDosage: '1–2 g once daily (IV/IM, per medical supervision)',
        frequency: 'Once daily',
        usualDuration: '7–14 days',
        notes: 'Severe/hospitalized cases; adult, general guideline',
      },
      {
        name: 'Azithromycin',
        recommendedDosage: '500 mg once daily',
        frequency: 'Once daily',
        usualDuration: '7 days',
        notes: 'Uncomplicated outpatient; adult, general guideline',
      },
      {
        name: 'Ciprofloxacin',
        recommendedDosage: '500 mg twice daily',
        frequency: 'Twice daily',
        usualDuration: '7–10 days',
        notes: 'Where local resistance patterns allow; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Confirm diagnosis with blood/stool culture where possible; antibiotic choice should account for local resistance patterns (fluoroquinolone resistance is common in some regions); complete the full antibiotic course to prevent relapse and carrier state; watch for complications (intestinal bleeding/perforation) requiring emergency care; maintain hydration and nutrition.',
    agePatientConsiderations:
      'Children: fluoroquinolones are generally avoided as first-line — ceftriaxone or azithromycin preferred. Pregnancy: azithromycin or ceftriaxone are generally preferred over fluoroquinolones. Ensure food/water hygiene during recovery and consider typhoid vaccination for prevention.',
    active: true,
  },
  {
    id: 'insomnia',
    order: 24,
    name: 'Insomnia (Short-Term)',
    commonSymptoms:
      'Difficulty falling or staying asleep, early waking, non-restorative sleep, daytime fatigue and irritability.',
    medicines: [
      {
        name: 'Melatonin',
        recommendedDosage: '1–3 mg, 30–60 minutes before bedtime',
        frequency: 'Once daily at night',
        usualDuration: 'Short-term, up to a few weeks',
        notes: 'Adult, general guideline',
      },
      {
        name: 'Zolpidem',
        recommendedDosage: '5–10 mg at bedtime',
        frequency: 'Once daily at night',
        usualDuration: 'Short-term, generally under 2 weeks',
        notes: 'Short-term prescription use; adult, general guideline',
      },
    ],
    precautionsWarnings:
      'Sedative-hypnotics carry risk of dependence, next-day drowsiness, and falls — use lowest effective dose for shortest duration; avoid alcohol; address underlying causes (stress, sleep hygiene, other conditions).',
    agePatientConsiderations:
      'Elderly: avoid or use extreme caution with sedative-hypnotics due to fall/fracture and confusion risk; behavioral sleep strategies preferred first. Pregnancy: sedative-hypnotics generally avoided; melatonin use should be discussed with a doctor.',
    active: true,
  },
];

function getDiseaseById(id) {
  return DISEASE_CATALOG.find((disease) => disease.id === id) || null;
}

function mergeMedicinesForDiseaseIds(ids) {
  if (!Array.isArray(ids)) return [];

  const seen = new Map();
  for (const id of ids) {
    const disease = getDiseaseById(id);
    if (!disease) continue;

    for (const medicine of disease.medicines) {
      const key = medicine.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { ...medicine });
      }
    }
  }

  return Array.from(seen.values());
}

module.exports = {
  MEDICATION_DISCLAIMER,
  DISEASE_CATALOG,
  getDiseaseById,
  mergeMedicinesForDiseaseIds,
};
