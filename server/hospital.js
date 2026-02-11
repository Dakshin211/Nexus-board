const mongoose = require('mongoose');
const Node = require('./models/Node');
require('dotenv').config();

const SEED_PROJECT = "medhub-core";

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Purging old MedHub data...");
  await Node.deleteMany({ projectId: SEED_PROJECT });

  const departments = [
    { name: "Emergency Trauma Center (ETC)", status: "error", icon: "TRM" },
    { name: "Critical Care / ICU Wing", status: "active", icon: "ICU" },
    { name: "Cardiovascular Surgery Suite", status: "active", icon: "CVO" },
    { name: "Neuro-Sciences Institute", status: "idle", icon: "NRO" },
    { name: "Diagnostic & Advanced Imaging", status: "active", icon: "RAD" },
    { name: "Molecular Oncology Unit", status: "active", icon: "ONC" },
    { name: "Pediatrics & Neonatal Care", status: "active", icon: "PED" },
    { name: "Clinical Pathology Labs", status: "idle", icon: "LAB" },
    { name: "Central Pharmacy & Logistics", status: "active", icon: "PHR" }
  ];

  const staffNames = [
    "Dr. Sarah Vance (Consultant)", "Dr. Arjun Kumar (Senior)", 
    "Head Nurse Elena Rossi", "Dr. Chen Wei (Specialist)", 
    "Dr. Marcus Thorne", "Senior Tech. Julian H.", "Officer Amara J."
  ];

  const equipmentNames = [
    "Vitals Monitor", "Ventilator v4", "Digital Infusion Pump",
    "Dialysis Unit", "Portable Ultrasound", "Anesthesia Rig", "Defibrillator"
  ];

  for (let index = 0; index < departments.length; index++) {
    const deptData = departments[index];
    
    // LOGIC: Place in 3 Columns (Left Wing, Center Wing, Right Wing)
    // Horizontal spacing: 2800px | Vertical spacing: 1000px
    const col = index % 3; 
    const row = Math.floor(index / 3);
    
    const deptX = 1000 + (col * 2800) + (Math.random() * 200);
    const deptY = 800 + (row * 1200) + (Math.random() * 200);

    // 1. Create Main Department
    const deptId = `dept-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await Node.create({
      nodeId: deptId,
      name: deptData.name,
      type: "folder",
      projectId: SEED_PROJECT,
      x: deptX,
      y: deptY,
      status: deptData.status,
      timestamp: Date.now()
    });

    // 2. Randomized Units (Branches)
    const unitCount = 2 + Math.floor(Math.random() * 3); 
    
    for (let i = 0; i < unitCount; i++) {
      const unitId = `unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      // Position units in a semi-circle or staggered below the department
      const unitX = deptX + (i * 500) - 600;
      const unitY = deptY + 400 + (Math.random() * 150);

      await Node.create({
        nodeId: unitId,
        name: `${deptData.name.split(' ')[0]} Section ${String.fromCharCode(65 + i)}`,
        parentId: deptId,
        type: "folder",
        projectId: SEED_PROJECT,
        x: unitX,
        y: unitY,
        status: "active",
        timestamp: Date.now()
      });

      // 3. Randomized Resources (Leaves)
      const resCount = 3 + Math.floor(Math.random() * 3); 
      for (let j = 0; j < resCount; j++) {
        const isStaff = Math.random() > 0.5;
        const resName = isStaff 
          ? staffNames[Math.floor(Math.random() * staffNames.length)]
          : `${equipmentNames[Math.floor(Math.random() * equipmentNames.length)]} [${deptData.icon}-${j}${i}]`;

        await Node.create({
          nodeId: `res-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: resName,
          parentId: unitId,
          type: "node",
          projectId: SEED_PROJECT,
          // Resources fan out below the units
          x: unitX + (j * 220) - 300 + (Math.random() * 50),
          y: unitY + 300 + (j * 40) + (Math.random() * 50),
          status: Math.random() > 0.92 ? "error" : "idle",
          timestamp: Date.now()
        });
      }
    }
  }

  console.log("✅ Organized HMS map 'medhub-core' generated!");
  process.exit();
}

seed();