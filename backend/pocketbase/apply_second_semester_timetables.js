const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, 'seed_data.json');
const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const SUB = {
  ENGL: 'subj00000000001',
  OOP: 'subj00000000002',
  DISCRETE: 'subj00000000003',
  ELECTRONICS: 'subj00000000004',
  STRUCT: 'subj00000000005',
  CSF: 'subj00000000006',
  NET: 'subj00000000007',
  ARCH: 'subj00000000008',
  SAD: 'subj00000000009',
  DIFF: 'subj00000000010',
  ALGO: 'subj00000000011',
  ISM: 'subj00000000012',
  IMG: 'subj00000000013',
  NN: 'subj00000000014',
  MAD: 'subj00000000015',
  OS: 'subj00000000016',
  SE: 'subj00000000017',
  MKT: 'subj00000000018',
  CV: 'subj00000000019',
  IOT: 'subj00000000020',
  CLOUD: 'subj00000000021',
  VAR: 'subj00000000022',
  HUM: 'subj00000000023',
  TECH: 'subj00000000024',
  MULTI: 'subj00000000025',
  OSS: 'subj00000000026',
};

const ROOM = {
  ROOM1: 'room00000000001',
  ROOM3: 'room00000000002',
  ROOM5: 'room00000000003',
  ROOM7: 'room00000000004',
  ROOM8: 'room00000000005',
  ROOM9: 'room00000000006',
  ROOM11: 'room00000000007',
  ROOM12: 'room00000000008',
  ROOM13: 'room00000000009',
  ROOM15: 'room00000000010',
  LABA: 'room00000000011',
  LABB: 'room00000000012',
  LAB1: 'room00000000013',
  LAB2: 'room00000000014',
  LAB3: 'room00000000015',
  LAB6: 'room00000000016',
  LAB7: 'room00000000017',
  LAB9: 'room00000000018',
};

const P = {
  ENGLISH: 'prof00000000001',
  OOP_MAD_IOT: 'prof00000000002',
  DISCRETE: 'prof00000000003',
  ELEC_NN_LECT: 'prof00000000004',
  CSF_LECT: 'prof00000000005',
  NET_OS_LECT: 'prof00000000006',
  ARCH_SE_CLOUD_LECT: 'prof00000000007',
  SAD_IMG_LECT: 'prof00000000008',
  DIFF_LECT: 'prof00000000009',
  ALGO_OSS_LECT: 'prof00000000010',
  ISM_CV_LECT: 'prof00000000011',
  GEN_STUDIES_LECT: 'prof00000000012',
  NET_OS_SECTIONS: 'prof00000000013',
  ARCH_IMG_CV_SECTIONS: 'prof00000000014',
  DIFF_ALGO_MULTI_SECTIONS: 'prof00000000015',
  SAD_SE_OSS_SECTIONS: 'prof00000000016',
  MAD_VAR_SECTIONS: 'prof00000000017',
  ISM_CLOUD_SECTIONS: 'prof00000000018',
  ELEC_NN_SECTIONS: 'prof00000000019',
  OOP_STRUCT_SECTIONS: 'prof00000000020',
  CSF_SECTIONS: 'prof00000000021',
  VAR_LECT: 'prof00000000022',
  IOT_SECTIONS: 'prof00000000023',
};

const groupByLevel = {
  '1': { g1: 'grup00000000001', g2: 'grup00000000002' },
  '2': { g1: 'grup00000000003', g2: 'grup00000000004' },
  '3': { g1: 'grup00000000005', g2: 'grup00000000006' },
  '4': { g1: 'grup00000000007', g2: 'grup00000000008' },
};

const slotTimes = {
  '1': ['09:00', '10:00', 60],
  '2': ['10:00', '11:00', 60],
  '3': ['11:00', '12:00', 60],
  '4': ['12:00', '13:00', 60],
  '5': ['13:00', '14:00', 60],
  '6': ['14:00', '15:00', 60],
  '7': ['15:00', '16:00', 60],
  '8': ['16:00', '16:30', 30],
};

function ensureSubject(subject) {
  const idx = data.subjects.findIndex((s) => s.id === subject.id);
  if (idx === -1) {
    data.subjects.push(subject);
  } else {
    data.subjects[idx] = { ...data.subjects[idx], ...subject };
  }
}

ensureSubject({
  id: SUB.HUM,
  code: 'HUM107',
  subject_code: 'HUM107',
  name_en: 'Human Rights and Anti-Corruption',
  name_ar: 'حقوق الإنسان ومكافحة الفساد',
  department: 'Computer Science',
  level: 1,
  credit_hours: 2,
  subject_type: 'lecture',
  semester: 'second',
  academic_year: '2025-2026',
  description: 'General studies course for first level.',
});

ensureSubject({
  id: SUB.TECH,
  code: 'TW108',
  subject_code: 'TW108',
  name_en: 'Technical Writing',
  name_ar: 'الكتابة الفنية',
  department: 'Computer Science',
  level: 1,
  credit_hours: 2,
  subject_type: 'lecture',
  semester: 'second',
  academic_year: '2025-2026',
  description: 'Technical writing skills for CS students.',
});

ensureSubject({
  id: SUB.MULTI,
  code: 'MUL307',
  subject_code: 'MUL307',
  name_en: 'Multimedia',
  name_ar: 'الوسائط المتعددة',
  department: 'Computer Science',
  level: 3,
  credit_hours: 3,
  subject_type: 'both',
  semester: 'second',
  academic_year: '2025-2026',
  description: 'Multimedia theory and practical labs.',
});

ensureSubject({
  id: SUB.OSS,
  code: 'OSS406',
  subject_code: 'OSS406',
  name_en: 'Open Source System Development',
  name_ar: 'تطوير نظم المصدر المفتوح',
  department: 'Computer Science',
  level: 4,
  credit_hours: 3,
  subject_type: 'both',
  semester: 'second',
  academic_year: '2025-2026',
  description: 'Open source systems and collaborative development.',
});

data.rooms = [
  { id: ROOM.ROOM1, room_code: 'Room 1', building: 'Main Building', capacity: 90, room_type: 'Classroom', equipment: ['projector', 'whiteboard', 'ac'] },
  { id: ROOM.ROOM3, room_code: 'Room 3', building: 'Main Building', capacity: 80, room_type: 'Classroom', equipment: ['projector', 'whiteboard', 'ac'] },
  { id: ROOM.ROOM5, room_code: 'Room 5', building: 'Main Building', capacity: 75, room_type: 'Classroom', equipment: ['projector', 'whiteboard', 'ac'] },
  { id: ROOM.ROOM7, room_code: 'Room 7', building: 'Main Building', capacity: 75, room_type: 'Classroom', equipment: ['projector', 'whiteboard', 'ac'] },
  { id: ROOM.ROOM8, room_code: 'Room 8', building: 'Main Building', capacity: 70, room_type: 'Classroom', equipment: ['projector', 'whiteboard', 'ac'] },
  { id: ROOM.ROOM9, room_code: 'Room 9', building: 'Main Building', capacity: 70, room_type: 'Classroom', equipment: ['projector', 'whiteboard', 'ac'] },
  { id: ROOM.ROOM11, room_code: 'Room 11', building: 'Main Building', capacity: 60, room_type: 'Classroom', equipment: ['projector', 'whiteboard', 'ac'] },
  { id: ROOM.ROOM12, room_code: 'Room 12', building: 'Main Building', capacity: 60, room_type: 'Classroom', equipment: ['projector', 'whiteboard', 'ac'] },
  { id: ROOM.ROOM13, room_code: 'Room 13', building: 'Main Building', capacity: 65, room_type: 'Classroom', equipment: ['projector', 'whiteboard', 'ac'] },
  { id: ROOM.ROOM15, room_code: 'Room 15', building: 'Main Building', capacity: 65, room_type: 'Classroom', equipment: ['projector', 'whiteboard', 'ac'] },
  { id: ROOM.LABA, room_code: 'Lab A', building: 'Labs Wing', capacity: 35, room_type: 'Lab', equipment: ['computers', 'projector', 'network'] },
  { id: ROOM.LABB, room_code: 'Lab B', building: 'Labs Wing', capacity: 35, room_type: 'Lab', equipment: ['computers', 'projector', 'network'] },
  { id: ROOM.LAB1, room_code: 'Lab 1', building: 'Labs Wing', capacity: 35, room_type: 'Lab', equipment: ['computers', 'projector', 'network'] },
  { id: ROOM.LAB2, room_code: 'Lab 2', building: 'Labs Wing', capacity: 35, room_type: 'Lab', equipment: ['computers', 'projector', 'network'] },
  { id: ROOM.LAB3, room_code: 'Lab 3', building: 'Labs Wing', capacity: 35, room_type: 'Lab', equipment: ['computers', 'projector', 'network'] },
  { id: ROOM.LAB6, room_code: 'Lab 6', building: 'Labs Wing', capacity: 35, room_type: 'Lab', equipment: ['computers', 'projector', 'network'] },
  { id: ROOM.LAB7, room_code: 'Lab 7', building: 'Labs Wing', capacity: 35, room_type: 'Lab', equipment: ['computers', 'projector', 'network'] },
  { id: ROOM.LAB9, room_code: 'Lab 9', building: 'Labs Wing', capacity: 35, room_type: 'Lab', equipment: ['computers', 'projector', 'network'] },
];

const professorDefs = [
  { id: P.ENGLISH, name_en: 'Dr. Adrian Vale', name_ar: 'د. أدريان فيل', email: 'adrian.vale@futureacademy.edu', rank: 'Professor' },
  { id: P.OOP_MAD_IOT, name_en: 'Dr. Liana Frost', name_ar: 'د. ليانا فروست', email: 'liana.frost@futureacademy.edu', rank: 'Associate Professor' },
  { id: P.DISCRETE, name_en: 'Dr. Mira Quinn', name_ar: 'د. ميرا كوين', email: 'mira.quinn@futureacademy.edu', rank: 'Professor' },
  { id: P.ELEC_NN_LECT, name_en: 'Dr. Jonas Hale', name_ar: 'د. جوناس هيل', email: 'jonas.hale@futureacademy.edu', rank: 'Associate Professor' },
  { id: P.CSF_LECT, name_en: 'Dr. Owen Vale', name_ar: 'د. أوين فيل', email: 'owen.vale@futureacademy.edu', rank: 'Professor' },
  { id: P.NET_OS_LECT, name_en: 'Dr. Caleb Stone', name_ar: 'د. كاليب ستون', email: 'caleb.stone@futureacademy.edu', rank: 'Professor' },
  { id: P.ARCH_SE_CLOUD_LECT, name_en: 'Dr. Talia Monroe', name_ar: 'د. تاليا مونرو', email: 'talia.monroe@futureacademy.edu', rank: 'Professor' },
  { id: P.SAD_IMG_LECT, name_en: 'Dr. Rowan Pierce', name_ar: 'د. روان بيرس', email: 'rowan.pierce@futureacademy.edu', rank: 'Associate Professor' },
  { id: P.DIFF_LECT, name_en: 'Dr. Vera Hart', name_ar: 'د. فيرا هارت', email: 'vera.hart@futureacademy.edu', rank: 'Professor' },
  { id: P.ALGO_OSS_LECT, name_en: 'Dr. Arman Blake', name_ar: 'د. آرمان بليك', email: 'arman.blake@futureacademy.edu', rank: 'Professor' },
  { id: P.ISM_CV_LECT, name_en: 'Dr. Selma North', name_ar: 'د. سلمى نورث', email: 'selma.north@futureacademy.edu', rank: 'Professor' },
  { id: P.GEN_STUDIES_LECT, name_en: 'Dr. Felix Kline', name_ar: 'د. فيليكس كلاين', email: 'felix.kline@futureacademy.edu', rank: 'Professor' },
  { id: P.NET_OS_SECTIONS, name_en: 'Eng. Rami Nash', name_ar: 'م. رامي ناش', email: 'rami.nash@futureacademy.edu', rank: 'Lecturer' },
  { id: P.ARCH_IMG_CV_SECTIONS, name_en: 'Eng. Talia Noor', name_ar: 'م. تاليا نور', email: 'talia.noor@futureacademy.edu', rank: 'Lecturer' },
  { id: P.DIFF_ALGO_MULTI_SECTIONS, name_en: 'Eng. Aya Mercer', name_ar: 'م. آية ميرسر', email: 'aya.mercer@futureacademy.edu', rank: 'Lecturer' },
  { id: P.SAD_SE_OSS_SECTIONS, name_en: 'Eng. Nadia Hale', name_ar: 'م. ناديا هيل', email: 'nadia.hale@futureacademy.edu', rank: 'Lecturer' },
  { id: P.MAD_VAR_SECTIONS, name_en: 'Eng. Lina Faris', name_ar: 'م. لينا فارس', email: 'lina.faris@futureacademy.edu', rank: 'Lecturer' },
  { id: P.ISM_CLOUD_SECTIONS, name_en: 'Eng. Omar Zane', name_ar: 'م. عمر زين', email: 'omar.zane@futureacademy.edu', rank: 'Lecturer' },
  { id: P.ELEC_NN_SECTIONS, name_en: 'Eng. Hana Wren', name_ar: 'م. هنا ورين', email: 'hana.wren@futureacademy.edu', rank: 'Lecturer' },
  { id: P.OOP_STRUCT_SECTIONS, name_en: 'Eng. Mira Sol', name_ar: 'م. ميرا سول', email: 'mira.sol@futureacademy.edu', rank: 'Lecturer' },
  { id: P.CSF_SECTIONS, name_en: 'Eng. Jade Frost', name_ar: 'م. جايد فروست', email: 'jade.frost@futureacademy.edu', rank: 'Lecturer' },
  { id: P.VAR_LECT, name_en: 'Dr. Celine Park', name_ar: 'د. سيلين بارك', email: 'celine.park@futureacademy.edu', rank: 'Associate Professor' },
  { id: P.IOT_SECTIONS, name_en: 'Eng. Kian Redd', name_ar: 'م. كيان رِد', email: 'kian.redd@futureacademy.edu', rank: 'Lecturer' },
];

const schedules = [];
let scheduleCounter = 1;

function addSchedule({ subject_id, professor_id, room_id, day_of_week, lecture_slot, session_type = 'lecture', level, group_id, section_number = '' }) {
  const [start_time, end_time, duration_minutes] = slotTimes[String(lecture_slot)];
  schedules.push({
    id: `schd${String(scheduleCounter).padStart(11, '0')}`,
    subject_id,
    room_id,
    professor_id,
    ta_id: '',
    group_id,
    day_of_week,
    lecture_slot: String(lecture_slot),
    start_time,
    end_time,
    duration_minutes,
    session_type,
    level: String(level),
    section_number,
    semester: 'Spring',
    academic_year: '2025-2026',
    is_active: true,
  });
  scheduleCounter += 1;
}

function g(level, variant) {
  return groupByLevel[String(level)][variant];
}

// Level 1 - lectures
addSchedule({ subject_id: SUB.ENGL, professor_id: P.ENGLISH, room_id: ROOM.ROOM1, day_of_week: 'Sunday', lecture_slot: 2, level: 1, group_id: g(1, 'g1') });
addSchedule({ subject_id: SUB.OOP, professor_id: P.OOP_MAD_IOT, room_id: ROOM.ROOM7, day_of_week: 'Sunday', lecture_slot: 4, level: 1, group_id: g(1, 'g2') });
addSchedule({ subject_id: SUB.OOP, professor_id: P.OOP_MAD_IOT, room_id: ROOM.ROOM7, day_of_week: 'Sunday', lecture_slot: 6, level: 1, group_id: g(1, 'g1') });
addSchedule({ subject_id: SUB.DISCRETE, professor_id: P.DISCRETE, room_id: ROOM.ROOM7, day_of_week: 'Monday', lecture_slot: 3, level: 1, group_id: g(1, 'g1') });
addSchedule({ subject_id: SUB.DISCRETE, professor_id: P.DISCRETE, room_id: ROOM.ROOM7, day_of_week: 'Monday', lecture_slot: 6, level: 1, group_id: g(1, 'g2') });
addSchedule({ subject_id: SUB.ELECTRONICS, professor_id: P.ELEC_NN_LECT, room_id: ROOM.ROOM3, day_of_week: 'Tuesday', lecture_slot: 1, level: 1, group_id: g(1, 'g1') });
addSchedule({ subject_id: SUB.HUM, professor_id: P.GEN_STUDIES_LECT, room_id: ROOM.ROOM1, day_of_week: 'Wednesday', lecture_slot: 3, level: 1, group_id: g(1, 'g1') });
addSchedule({ subject_id: SUB.TECH, professor_id: P.GEN_STUDIES_LECT, room_id: ROOM.ROOM1, day_of_week: 'Wednesday', lecture_slot: 6, level: 1, group_id: g(1, 'g1') });

// Level 1 - sections
addSchedule({ subject_id: SUB.OOP, professor_id: P.OOP_STRUCT_SECTIONS, room_id: ROOM.LABA, day_of_week: 'Sunday', lecture_slot: 5, session_type: 'section', level: 1, group_id: g(1, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.ELECTRONICS, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.ROOM5, day_of_week: 'Sunday', lecture_slot: 7, session_type: 'section', level: 1, group_id: g(1, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.OOP, professor_id: P.OOP_STRUCT_SECTIONS, room_id: ROOM.LAB9, day_of_week: 'Sunday', lecture_slot: 8, session_type: 'section', level: 1, group_id: g(1, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.OOP, professor_id: P.OOP_STRUCT_SECTIONS, room_id: ROOM.LABB, day_of_week: 'Monday', lecture_slot: 2, session_type: 'section', level: 1, group_id: g(1, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.OOP, professor_id: P.OOP_STRUCT_SECTIONS, room_id: ROOM.LABB, day_of_week: 'Monday', lecture_slot: 4, session_type: 'section', level: 1, group_id: g(1, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.ELECTRONICS, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.ROOM7, day_of_week: 'Monday', lecture_slot: 7, session_type: 'section', level: 1, group_id: g(1, 'g2'), section_number: 'Sec 2,4' });
addSchedule({ subject_id: SUB.ELECTRONICS, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.ROOM5, day_of_week: 'Tuesday', lecture_slot: 4, session_type: 'section', level: 1, group_id: g(1, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.OOP, professor_id: P.OOP_STRUCT_SECTIONS, room_id: ROOM.LABA, day_of_week: 'Tuesday', lecture_slot: 5, session_type: 'section', level: 1, group_id: g(1, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.ELECTRONICS, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.ROOM5, day_of_week: 'Tuesday', lecture_slot: 6, session_type: 'section', level: 1, group_id: g(1, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.OOP, professor_id: P.OOP_STRUCT_SECTIONS, room_id: ROOM.LAB9, day_of_week: 'Tuesday', lecture_slot: 7, session_type: 'section', level: 1, group_id: g(1, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.STRUCT, professor_id: P.OOP_STRUCT_SECTIONS, room_id: ROOM.LAB1, day_of_week: 'Tuesday', lecture_slot: 3, session_type: 'section', level: 1, group_id: g(1, 'g2'), section_number: 'Sec 2,4' });
addSchedule({ subject_id: SUB.STRUCT, professor_id: P.OOP_STRUCT_SECTIONS, room_id: ROOM.LAB1, day_of_week: 'Tuesday', lecture_slot: 6, session_type: 'section', level: 1, group_id: g(1, 'g1'), section_number: 'Sec 1,3' });
addSchedule({ subject_id: SUB.DISCRETE, professor_id: P.DIFF_ALGO_MULTI_SECTIONS, room_id: ROOM.ROOM7, day_of_week: 'Wednesday', lecture_slot: 2, session_type: 'section', level: 1, group_id: g(1, 'g1'), section_number: 'Sec 1,3' });
addSchedule({ subject_id: SUB.ELECTRONICS, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.ROOM5, day_of_week: 'Wednesday', lecture_slot: 4, session_type: 'section', level: 1, group_id: g(1, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.CSF, professor_id: P.CSF_SECTIONS, room_id: ROOM.LAB9, day_of_week: 'Thursday', lecture_slot: 3, session_type: 'section', level: 1, group_id: g(1, 'g1'), section_number: 'Sec 1,3' });
addSchedule({ subject_id: SUB.CSF, professor_id: P.CSF_SECTIONS, room_id: ROOM.LAB9, day_of_week: 'Thursday', lecture_slot: 6, session_type: 'section', level: 1, group_id: g(1, 'g2'), section_number: 'Sec 2,4' });

// Level 2 - lectures
addSchedule({ subject_id: SUB.NET, professor_id: P.NET_OS_LECT, room_id: ROOM.ROOM13, day_of_week: 'Sunday', lecture_slot: 3, level: 2, group_id: g(2, 'g1') });
addSchedule({ subject_id: SUB.NET, professor_id: P.NET_OS_LECT, room_id: ROOM.ROOM13, day_of_week: 'Sunday', lecture_slot: 5, level: 2, group_id: g(2, 'g2') });
addSchedule({ subject_id: SUB.SAD, professor_id: P.SAD_IMG_LECT, room_id: ROOM.ROOM15, day_of_week: 'Monday', lecture_slot: 3, level: 2, group_id: g(2, 'g1') });
addSchedule({ subject_id: SUB.SAD, professor_id: P.SAD_IMG_LECT, room_id: ROOM.ROOM15, day_of_week: 'Monday', lecture_slot: 5, level: 2, group_id: g(2, 'g2') });
addSchedule({ subject_id: SUB.DIFF, professor_id: P.DIFF_LECT, room_id: ROOM.ROOM7, day_of_week: 'Wednesday', lecture_slot: 6, level: 2, group_id: g(2, 'g1') });
addSchedule({ subject_id: SUB.ARCH, professor_id: P.ARCH_SE_CLOUD_LECT, room_id: ROOM.ROOM9, day_of_week: 'Thursday', lecture_slot: 2, level: 2, group_id: g(2, 'g2') });
addSchedule({ subject_id: SUB.ARCH, professor_id: P.ARCH_SE_CLOUD_LECT, room_id: ROOM.ROOM9, day_of_week: 'Thursday', lecture_slot: 4, level: 2, group_id: g(2, 'g1') });
addSchedule({ subject_id: SUB.ALGO, professor_id: P.ALGO_OSS_LECT, room_id: ROOM.ROOM12, day_of_week: 'Thursday', lecture_slot: 6, level: 2, group_id: g(2, 'g2') });
addSchedule({ subject_id: SUB.ALGO, professor_id: P.ALGO_OSS_LECT, room_id: ROOM.ROOM12, day_of_week: 'Thursday', lecture_slot: 7, level: 2, group_id: g(2, 'g1') });

// Level 2 - sections
addSchedule({ subject_id: SUB.NET, professor_id: P.NET_OS_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Sunday', lecture_slot: 2, session_type: 'section', level: 2, group_id: g(2, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.ARCH, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB1, day_of_week: 'Sunday', lecture_slot: 4, session_type: 'section', level: 2, group_id: g(2, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.ARCH, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB1, day_of_week: 'Sunday', lecture_slot: 6, session_type: 'section', level: 2, group_id: g(2, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.NET, professor_id: P.NET_OS_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Monday', lecture_slot: 2, session_type: 'section', level: 2, group_id: g(2, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.NET, professor_id: P.NET_OS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Monday', lecture_slot: 4, session_type: 'section', level: 2, group_id: g(2, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.NET, professor_id: P.NET_OS_SECTIONS, room_id: ROOM.LABA, day_of_week: 'Monday', lecture_slot: 7, session_type: 'section', level: 2, group_id: g(2, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.NET, professor_id: P.NET_OS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Monday', lecture_slot: 8, session_type: 'section', level: 2, group_id: g(2, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.ARCH, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB1, day_of_week: 'Monday', lecture_slot: 6, session_type: 'section', level: 2, group_id: g(2, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.DIFF, professor_id: P.DIFF_ALGO_MULTI_SECTIONS, room_id: ROOM.ROOM12, day_of_week: 'Wednesday', lecture_slot: 2, session_type: 'section', level: 2, group_id: g(2, 'g1'), section_number: 'Sec 1,3' });
addSchedule({ subject_id: SUB.DIFF, professor_id: P.DIFF_ALGO_MULTI_SECTIONS, room_id: ROOM.ROOM12, day_of_week: 'Wednesday', lecture_slot: 4, session_type: 'section', level: 2, group_id: g(2, 'g2'), section_number: 'Sec 2,4' });
addSchedule({ subject_id: SUB.SAD, professor_id: P.SAD_SE_OSS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Thursday', lecture_slot: 2, session_type: 'section', level: 2, group_id: g(2, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.SAD, professor_id: P.SAD_SE_OSS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Thursday', lecture_slot: 4, session_type: 'section', level: 2, group_id: g(2, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.SAD, professor_id: P.SAD_SE_OSS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Thursday', lecture_slot: 6, session_type: 'section', level: 2, group_id: g(2, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.SAD, professor_id: P.SAD_SE_OSS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Thursday', lecture_slot: 8, session_type: 'section', level: 2, group_id: g(2, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.ALGO, professor_id: P.DIFF_ALGO_MULTI_SECTIONS, room_id: ROOM.LAB1, day_of_week: 'Thursday', lecture_slot: 3, session_type: 'section', level: 2, group_id: g(2, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.ALGO, professor_id: P.DIFF_ALGO_MULTI_SECTIONS, room_id: ROOM.LAB1, day_of_week: 'Thursday', lecture_slot: 4, session_type: 'section', level: 2, group_id: g(2, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.ALGO, professor_id: P.DIFF_ALGO_MULTI_SECTIONS, room_id: ROOM.LAB1, day_of_week: 'Thursday', lecture_slot: 6, session_type: 'section', level: 2, group_id: g(2, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.ALGO, professor_id: P.DIFF_ALGO_MULTI_SECTIONS, room_id: ROOM.LAB1, day_of_week: 'Thursday', lecture_slot: 8, session_type: 'section', level: 2, group_id: g(2, 'g2'), section_number: 'Sec 4' });

// Level 3 - lectures
addSchedule({ subject_id: SUB.ISM, professor_id: P.ISM_CV_LECT, room_id: ROOM.ROOM9, day_of_week: 'Sunday', lecture_slot: 3, level: 3, group_id: g(3, 'g1') });
addSchedule({ subject_id: SUB.ISM, professor_id: P.ISM_CV_LECT, room_id: ROOM.ROOM9, day_of_week: 'Sunday', lecture_slot: 5, level: 3, group_id: g(3, 'g2') });
addSchedule({ subject_id: SUB.MAD, professor_id: P.OOP_MAD_IOT, room_id: ROOM.ROOM7, day_of_week: 'Monday', lecture_slot: 2, level: 3, group_id: g(3, 'g1') });
addSchedule({ subject_id: SUB.OS, professor_id: P.NET_OS_LECT, room_id: ROOM.ROOM13, day_of_week: 'Monday', lecture_slot: 3, level: 3, group_id: g(3, 'g1') });
addSchedule({ subject_id: SUB.OS, professor_id: P.NET_OS_LECT, room_id: ROOM.ROOM13, day_of_week: 'Monday', lecture_slot: 5, level: 3, group_id: g(3, 'g2') });
addSchedule({ subject_id: SUB.SE, professor_id: P.ARCH_SE_CLOUD_LECT, room_id: ROOM.ROOM9, day_of_week: 'Tuesday', lecture_slot: 2, level: 3, group_id: g(3, 'g1') });
addSchedule({ subject_id: SUB.SE, professor_id: P.ARCH_SE_CLOUD_LECT, room_id: ROOM.ROOM9, day_of_week: 'Tuesday', lecture_slot: 6, level: 3, group_id: g(3, 'g2') });
addSchedule({ subject_id: SUB.MULTI, professor_id: P.GEN_STUDIES_LECT, room_id: ROOM.ROOM11, day_of_week: 'Thursday', lecture_slot: 2, level: 3, group_id: g(3, 'g1') });
addSchedule({ subject_id: SUB.NN, professor_id: P.ELEC_NN_LECT, room_id: ROOM.ROOM13, day_of_week: 'Thursday', lecture_slot: 5, level: 3, group_id: g(3, 'g2') });
addSchedule({ subject_id: SUB.NN, professor_id: P.ELEC_NN_LECT, room_id: ROOM.ROOM13, day_of_week: 'Thursday', lecture_slot: 7, level: 3, group_id: g(3, 'g1') });
addSchedule({ subject_id: SUB.IMG, professor_id: P.SAD_IMG_LECT, room_id: ROOM.ROOM15, day_of_week: 'Thursday', lecture_slot: 4, level: 3, group_id: g(3, 'g1') });
addSchedule({ subject_id: SUB.IMG, professor_id: P.SAD_IMG_LECT, room_id: ROOM.ROOM15, day_of_week: 'Thursday', lecture_slot: 6, level: 3, group_id: g(3, 'g2') });

// Level 3 - sections
addSchedule({ subject_id: SUB.ISM, professor_id: P.ISM_CLOUD_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Sunday', lecture_slot: 2, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.ISM, professor_id: P.ISM_CLOUD_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Sunday', lecture_slot: 4, session_type: 'section', level: 3, group_id: g(3, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.ISM, professor_id: P.ISM_CLOUD_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Sunday', lecture_slot: 6, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.ISM, professor_id: P.ISM_CLOUD_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Sunday', lecture_slot: 8, session_type: 'section', level: 3, group_id: g(3, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.MAD, professor_id: P.MAD_VAR_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Sunday', lecture_slot: 2, session_type: 'section', level: 3, group_id: g(3, 'g2'), section_number: 'Sec 2,4' });
addSchedule({ subject_id: SUB.NN, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Sunday', lecture_slot: 4, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.MAD, professor_id: P.MAD_VAR_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Sunday', lecture_slot: 8, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 1,3' });
addSchedule({ subject_id: SUB.IMG, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Monday', lecture_slot: 4, session_type: 'section', level: 3, group_id: g(3, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.IMG, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Monday', lecture_slot: 6, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.IMG, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Monday', lecture_slot: 8, session_type: 'section', level: 3, group_id: g(3, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.NN, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Monday', lecture_slot: 4, session_type: 'section', level: 3, group_id: g(3, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.NN, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Monday', lecture_slot: 6, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.NN, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Monday', lecture_slot: 8, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.MULTI, professor_id: P.DIFF_ALGO_MULTI_SECTIONS, room_id: ROOM.LAB3, day_of_week: 'Tuesday', lecture_slot: 3, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec' });
addSchedule({ subject_id: SUB.OS, professor_id: P.NET_OS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Tuesday', lecture_slot: 2, session_type: 'section', level: 3, group_id: g(3, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.OS, professor_id: P.NET_OS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Tuesday', lecture_slot: 4, session_type: 'section', level: 3, group_id: g(3, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.OS, professor_id: P.NET_OS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Tuesday', lecture_slot: 6, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.OS, professor_id: P.NET_OS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Tuesday', lecture_slot: 8, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.SE, professor_id: P.SAD_SE_OSS_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Tuesday', lecture_slot: 4, session_type: 'section', level: 3, group_id: g(3, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.SE, professor_id: P.SAD_SE_OSS_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Tuesday', lecture_slot: 6, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.SE, professor_id: P.SAD_SE_OSS_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Tuesday', lecture_slot: 8, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.IMG, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Tuesday', lecture_slot: 4, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.NN, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.LABA, day_of_week: 'Thursday', lecture_slot: 3, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.NN, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.LABB, day_of_week: 'Thursday', lecture_slot: 4, session_type: 'section', level: 3, group_id: g(3, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.NN, professor_id: P.ELEC_NN_SECTIONS, room_id: ROOM.LAB3, day_of_week: 'Thursday', lecture_slot: 8, session_type: 'section', level: 3, group_id: g(3, 'g2'), section_number: 'Sec 4' });

// Level 4 - lectures
addSchedule({ subject_id: SUB.CV, professor_id: P.ISM_CV_LECT, room_id: ROOM.ROOM9, day_of_week: 'Sunday', lecture_slot: 2, level: 4, group_id: g(4, 'g1') });
addSchedule({ subject_id: SUB.MKT, professor_id: P.GEN_STUDIES_LECT, room_id: ROOM.ROOM13, day_of_week: 'Tuesday', lecture_slot: 7, level: 4, group_id: g(4, 'g2') });
addSchedule({ subject_id: SUB.IOT, professor_id: P.OOP_MAD_IOT, room_id: ROOM.ROOM8, day_of_week: 'Wednesday', lecture_slot: 2, level: 4, group_id: g(4, 'g1') });
addSchedule({ subject_id: SUB.CLOUD, professor_id: P.ARCH_SE_CLOUD_LECT, room_id: ROOM.ROOM9, day_of_week: 'Wednesday', lecture_slot: 4, level: 4, group_id: g(4, 'g1') });
addSchedule({ subject_id: SUB.VAR, professor_id: P.VAR_LECT, room_id: ROOM.ROOM13, day_of_week: 'Thursday', lecture_slot: 3, level: 4, group_id: g(4, 'g1') });
addSchedule({ subject_id: SUB.OSS, professor_id: P.ALGO_OSS_LECT, room_id: ROOM.ROOM15, day_of_week: 'Thursday', lecture_slot: 4, level: 4, group_id: g(4, 'g1') });

// Level 4 - sections
addSchedule({ subject_id: SUB.CV, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Sunday', lecture_slot: 4, session_type: 'section', level: 4, group_id: g(4, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.CV, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Sunday', lecture_slot: 6, session_type: 'section', level: 4, group_id: g(4, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.CV, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Sunday', lecture_slot: 8, session_type: 'section', level: 4, group_id: g(4, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.CV, professor_id: P.ARCH_IMG_CV_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Tuesday', lecture_slot: 2, session_type: 'section', level: 4, group_id: g(4, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.MKT, professor_id: P.GEN_STUDIES_LECT, room_id: ROOM.ROOM12, day_of_week: 'Tuesday', lecture_slot: 3, session_type: 'section', level: 4, group_id: g(4, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.VAR, professor_id: P.MAD_VAR_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Wednesday', lecture_slot: 6, session_type: 'section', level: 4, group_id: g(4, 'g1'), section_number: 'Sec 1,3' });
addSchedule({ subject_id: SUB.VAR, professor_id: P.MAD_VAR_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Wednesday', lecture_slot: 8, session_type: 'section', level: 4, group_id: g(4, 'g2'), section_number: 'Sec 2,4' });
addSchedule({ subject_id: SUB.OSS, professor_id: P.SAD_SE_OSS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Wednesday', lecture_slot: 7, session_type: 'section', level: 4, group_id: g(4, 'g2'), section_number: 'Sec 2,4' });
addSchedule({ subject_id: SUB.OSS, professor_id: P.SAD_SE_OSS_SECTIONS, room_id: ROOM.LAB7, day_of_week: 'Wednesday', lecture_slot: 8, session_type: 'section', level: 4, group_id: g(4, 'g1'), section_number: 'Sec 1,3' });
addSchedule({ subject_id: SUB.IOT, professor_id: P.IOT_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Thursday', lecture_slot: 2, session_type: 'section', level: 4, group_id: g(4, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.IOT, professor_id: P.IOT_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Thursday', lecture_slot: 4, session_type: 'section', level: 4, group_id: g(4, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.IOT, professor_id: P.IOT_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Thursday', lecture_slot: 6, session_type: 'section', level: 4, group_id: g(4, 'g2'), section_number: 'Sec 4' });
addSchedule({ subject_id: SUB.IOT, professor_id: P.IOT_SECTIONS, room_id: ROOM.LAB6, day_of_week: 'Thursday', lecture_slot: 8, session_type: 'section', level: 4, group_id: g(4, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.CLOUD, professor_id: P.ISM_CLOUD_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Thursday', lecture_slot: 2, session_type: 'section', level: 4, group_id: g(4, 'g1'), section_number: 'Sec 1' });
addSchedule({ subject_id: SUB.CLOUD, professor_id: P.ISM_CLOUD_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Thursday', lecture_slot: 4, session_type: 'section', level: 4, group_id: g(4, 'g2'), section_number: 'Sec 2' });
addSchedule({ subject_id: SUB.CLOUD, professor_id: P.ISM_CLOUD_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Thursday', lecture_slot: 6, session_type: 'section', level: 4, group_id: g(4, 'g1'), section_number: 'Sec 3' });
addSchedule({ subject_id: SUB.CLOUD, professor_id: P.ISM_CLOUD_SECTIONS, room_id: ROOM.LAB2, day_of_week: 'Thursday', lecture_slot: 8, session_type: 'section', level: 4, group_id: g(4, 'g2'), section_number: 'Sec 4' });

// Rebuild professor assignments from schedules (keeps mutual subject mapping accurate).
const assignedByProfessor = new Map();
for (const s of schedules) {
  if (!assignedByProfessor.has(s.professor_id)) assignedByProfessor.set(s.professor_id, new Set());
  assignedByProfessor.get(s.professor_id).add(s.subject_id);
}

data.professors = professorDefs.map((prof, idx) => {
  const assigned = Array.from(assignedByProfessor.get(prof.id) || []);
  return {
    id: prof.id,
    national_id: `39001000${String(idx + 1).padStart(4, '0')}`,
    name_en: prof.name_en,
    name_ar: prof.name_ar,
    rfid_uid: `PF:FX:${String(idx + 1).padStart(2, '0')}`,
    session_pin: String(1300 + idx),
    session_passcode: '1234',
    passcode_updated_at: '2026-01-01T00:00:00Z',
    department: 'Computer Science',
    academic_rank: prof.rank,
    email: prof.email,
    office_location: `Faculty-${(idx % 12) + 1}`,
    phone: `+201555${String(1000 + idx)}`,
    avatar_url: '',
    assigned_courses: assigned,
    assigned_subjects: assigned,
    active_session_status: false,
    status: 'active',
    password: 'Professor@123',
  };
});

// Ensure every group has at least one schedule for each enrolled subject of its students.
const studentById = new Map((data.students || []).map((s) => [s.id, s]));
const scheduledSubjectsByGroup = new Map();

for (const row of schedules) {
  if (!scheduledSubjectsByGroup.has(row.group_id)) scheduledSubjectsByGroup.set(row.group_id, new Set());
  scheduledSubjectsByGroup.get(row.group_id).add(row.subject_id);
}

for (const group of data.groups || []) {
  const memberIds = Array.isArray(group.students) ? group.students : [];
  const firstStudent = memberIds.length ? studentById.get(memberIds[0]) : null;
  const parsedLevel = Number(String(group.group_name || '').replace(/[^0-9]/g, '').slice(0, 1)) || null;
  const groupLevel = firstStudent?.level || (parsedLevel ? String(parsedLevel) : null);

  const expectedSubjects = new Set();
  for (const studentId of memberIds) {
    const student = studentById.get(studentId);
    if (!student) continue;
    const enrolled = Array.isArray(student.enrolled_subjects) && student.enrolled_subjects.length
      ? student.enrolled_subjects
      : (Array.isArray(student.registered_courses) ? student.registered_courses : []);
    for (const subjectId of enrolled) expectedSubjects.add(subjectId);
  }

  if (!scheduledSubjectsByGroup.has(group.id)) {
    scheduledSubjectsByGroup.set(group.id, new Set());
  }

  for (const subjectId of expectedSubjects) {
    if (scheduledSubjectsByGroup.get(group.id).has(subjectId)) continue;

    const template = schedules.find(
      (s) => s.subject_id === subjectId && String(s.level) === String(groupLevel || '')
    ) || schedules.find((s) => s.subject_id === subjectId);

    if (!template) continue;

    schedules.push({
      ...template,
      id: `schd${String(scheduleCounter).padStart(11, '0')}`,
      group_id: group.id,
      level: String(groupLevel || template.level || ''),
      ta_id: '',
      is_active: true,
    });
    scheduleCounter += 1;
    scheduledSubjectsByGroup.get(group.id).add(subjectId);
  }
}

data.schedules = schedules;

// Build historical sessions and attendance records from the new schedules.
const studentsByGroup = new Map();
const studentSubjects = new Map();

for (const student of data.students || []) {
  const gid = student.group_id;
  if (gid) {
    if (!studentsByGroup.has(gid)) studentsByGroup.set(gid, []);
    studentsByGroup.get(gid).push(student.id);
  }

  const enrolled = Array.isArray(student.enrolled_subjects) && student.enrolled_subjects.length
    ? student.enrolled_subjects
    : (Array.isArray(student.registered_courses) ? student.registered_courses : []);
  studentSubjects.set(student.id, new Set(enrolled));
}

const dayOffsets = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function parseTimeToHoursMinutes(timeText) {
  const [h, m] = String(timeText || '09:00').split(':');
  return [Number(h || 9), Number(m || 0)];
}

function sessionStartForSchedule(schedule, weekOffset) {
  // Semester starts on a Sunday so weekday mapping remains deterministic.
  const semesterStartSundayUtc = Date.UTC(2026, 1, 22, 0, 0, 0, 0); // 2026-02-22
  const dayOffset = dayOffsets[schedule.day_of_week] ?? 0;
  const date = new Date(semesterStartSundayUtc + (dayOffset + (weekOffset * 7)) * 24 * 60 * 60 * 1000);
  const [hour, minute] = parseTimeToHoursMinutes(schedule.start_time);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function deterministicPercent(...parts) {
  const text = parts.join('|');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 33) + text.charCodeAt(i)) % 1000003;
  }
  return hash % 100;
}

const sessions = [];
const attendanceRecords = [];
const sessionsPerSchedule = 2;
let sessionCounter = 1;
let attendanceCounter = 1;

for (const schedule of schedules) {
  const groupStudents = studentsByGroup.get(schedule.group_id) || [];

  for (let weekIndex = 0; weekIndex < sessionsPerSchedule; weekIndex += 1) {
    const startAt = sessionStartForSchedule(schedule, weekIndex);
    const endAt = new Date(startAt.getTime() + (Number(schedule.duration_minutes || 60) * 60 * 1000));
    const perSessionAttendance = [];
    let presentCount = 0;
    let absentCount = 0;

    for (const studentId of groupStudents) {
      const enrolled = studentSubjects.get(studentId);
      if (enrolled && !enrolled.has(schedule.subject_id)) {
        continue;
      }

      const score = deterministicPercent(studentId, schedule.id, String(weekIndex + 1));
      let status = 'Present';
      if (score >= 80 && score < 92) status = 'Late';
      if (score >= 92) status = 'Absent';

      if (status === 'Absent') absentCount += 1;
      else presentCount += 1;

      const checkInOffsetMinutes = Math.min(25, score % 28);
      const checkInTime = new Date(startAt.getTime() + (checkInOffsetMinutes * 60 * 1000));

      perSessionAttendance.push({
        id: `attd${String(attendanceCounter).padStart(11, '0')}`,
        student_id: studentId,
        session_id: `sess${String(sessionCounter).padStart(11, '0')}`,
        subject_id: schedule.subject_id,
        check_in_time: checkInTime.toISOString(),
        status,
        verified: true,
      });
      attendanceCounter += 1;
    }

    if (perSessionAttendance.length === 0) {
      continue;
    }

    sessions.push({
      id: `sess${String(sessionCounter).padStart(11, '0')}`,
      schedule_id: schedule.id,
      professor_id: schedule.professor_id,
      start_time: startAt.toISOString(),
      end_time: endAt.toISOString(),
      status: 'Closed',
      total_students: perSessionAttendance.length,
      present_count: presentCount,
      absent_count: absentCount,
    });

    attendanceRecords.push(...perSessionAttendance);
    sessionCounter += 1;
  }
}

data.sessions = sessions;
data.attendance_records = attendanceRecords;

// Quick coverage check: each student should have attendance in every enrolled subject.
const attendanceByStudentSubject = new Map();
for (const row of attendanceRecords) {
  if (!attendanceByStudentSubject.has(row.student_id)) attendanceByStudentSubject.set(row.student_id, new Set());
  attendanceByStudentSubject.get(row.student_id).add(row.subject_id);
}

const uncovered = [];
for (const student of data.students || []) {
  const expected = studentSubjects.get(student.id) || new Set();
  const seen = attendanceByStudentSubject.get(student.id) || new Set();
  for (const subjectId of expected) {
    if (!seen.has(subjectId)) uncovered.push({ student_id: student.id, subject_id: subjectId });
  }
}

fs.writeFileSync(seedPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Updated seed_data.json with ${data.subjects.length} subjects, ${data.rooms.length} rooms/labs, ${data.professors.length} fake professors, ${data.schedules.length} schedule rows, ${data.sessions.length} sessions, ${data.attendance_records.length} attendance records.`);
if (uncovered.length) {
  console.warn(`Coverage warning: ${uncovered.length} student-subject pair(s) have no attendance records.`);
}
