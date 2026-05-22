import { promises as fs } from 'fs';
import path from 'path';

type Role = 'PROMPT' | 'SOLUTION' | 'RUBRIC';
type BlockType = 'paragraph' | 'table';
type NodeType = 'PART' | 'CONTEXT' | 'QUESTION' | 'SUBQUESTION';

type ReviewedBlock = {
  id: string;
  role: Role;
  type: BlockType;
  value: string;
  data?: {
    rows: string[][];
  };
};

type ReviewedNode = {
  id: string;
  nodeType: NodeType;
  parentId: string | null;
  orderIndex: number;
  label: string | null;
  maxPoints: number | null;
  topicCodes: string[];
  blocks: ReviewedBlock[];
};

type ReviewedVariant = {
  code: 'SUJET_1' | 'SUJET_2';
  title: string;
  nodes: ReviewedNode[];
};

type PaperSpec = {
  slug: string;
  title: string;
  year: number;
  sessionType: 'NORMAL' | 'MAKEUP';
  durationMinutes?: number;
  sourceArtifact: string;
  variants: ReviewedVariant[];
};

const repoRoot = path.resolve(__dirname, '../../..');
const outDir = path.join(repoRoot, 'extracted papers/english/reviewed');

const papers: PaperSpec[] = [
  build2021Shared(),
  build2018Lp(),
  build2014Le(),
  build2012Le(),
  build2011Le(),
  build2011Shared(),
  build2010Le(),
  build2009Lp(),
  build2017SharedMakeup(),
  build2017LeMakeup(),
  build2017LpMakeup(),
];

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const results = [];
  for (const paper of papers) {
    const reviewed = {
      variants: paper.variants,
      assets: [],
      uncertainties: [],
      exam: {
        title: paper.title,
        durationMinutes: paper.durationMinutes ?? 150,
        totalPoints: 20,
        sourceLanguage: 'en',
        hasCorrection: true,
      },
      metadata: {
        route: 'codex_direct_visual_reconstruction',
        sourceArtifact: paper.sourceArtifact,
        normalizedAt: new Date().toISOString(),
        notes:
          'Direct visual extraction from stored page images; native text/table blocks; no human crop debt.',
      },
    };
    const outPath = path.join(outDir, `${paper.slug}.reviewed.json`);
    await fs.writeFile(`${outPath}.tmp`, `${JSON.stringify(reviewed, null, 2)}\n`);
    await fs.rename(`${outPath}.tmp`, outPath);
    results.push({
      slug: paper.slug,
      reviewedFile: path.relative(repoRoot, outPath),
      variants: paper.variants.length,
      nodes: paper.variants.reduce(
        (sum, variant) => sum + variant.nodes.length,
        0,
      ),
    });
  }

  const manifestPath = path.join(outDir, 'visual-reconstruction-manifest.json');
  await fs.writeFile(
    `${manifestPath}.tmp`,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        route: 'codex_direct_visual_reconstruction',
        results,
      },
      null,
      2,
    )}\n`,
  );
  await fs.rename(`${manifestPath}.tmp`, manifestPath);
  console.log(JSON.stringify(results, null, 2));
}

function build2021Shared(): PaperSpec {
  return {
    slug: 'bac-english-se-m-tm-ge-2021-normal',
    title: 'بكالوريا 2021 - اختبار في مادة: اللغة الإنجليزية',
    year: 2021,
    sessionType: 'NORMAL',
    sourceArtifact:
      'output/r2-bac-assets/bac/2021/pages/bac-exam-english-se-m-tm-ge-2021-normal',
    variants: [
      build2021SharedSujet1(),
      build2021SharedSujet2(),
    ],
  };
}

function build2018Lp(): PaperSpec {
  return {
    slug: 'bac-english-lp-2018-normal',
    title: 'بكالوريا 2018 - اختبار في مادة: اللغة الإنجليزية',
    year: 2018,
    sessionType: 'NORMAL',
    sourceArtifact:
      'output/r2-bac-assets/bac/2018/pages/bac-exam-english-lp-2018-normal',
    variants: [
      build2018LpSujet1(),
      build2018LpSujet2(),
    ],
  };
}

function build2014Le(): PaperSpec {
  return {
    slug: 'bac-english-le-2014-normal',
    title: 'بكالوريا 2014 - اختبار في مادة: اللغة الإنجليزية',
    year: 2014,
    sessionType: 'NORMAL',
    durationMinutes: 210,
    sourceArtifact:
      'output/r2-bac-assets/bac/2014/pages/bac-exam-english-le-2014-normal',
    variants: [
      build2014LeSujet1(),
      build2014LeSujet2(),
    ],
  };
}

function build2012Le(): PaperSpec {
  return {
    slug: 'bac-english-le-2012-normal',
    title: 'بكالوريا 2012 - اختبار في مادة: اللغة الإنجليزية',
    year: 2012,
    sessionType: 'NORMAL',
    durationMinutes: 210,
    sourceArtifact:
      'output/r2-bac-assets/bac/2012/pages/bac-exam-english-le-2012-normal',
    variants: [
      build2012LeSujet1(),
      build2012LeSujet2(),
    ],
  };
}

function build2011Le(): PaperSpec {
  return {
    slug: 'bac-english-le-2011-normal',
    title: 'بكالوريا 2011 - اختبار في مادة: اللغة الإنجليزية',
    year: 2011,
    sessionType: 'NORMAL',
    durationMinutes: 210,
    sourceArtifact:
      'output/r2-bac-assets/bac/2011/pages/bac-exam-english-le-2011-normal',
    variants: [
      build2011LeSujet1(),
      build2011LeSujet2(),
    ],
  };
}

function build2011Shared(): PaperSpec {
  return {
    slug: 'bac-english-se-m-tm-ge-2011-normal',
    title: 'بكالوريا 2011 - اختبار في مادة: اللغة الإنجليزية',
    year: 2011,
    sessionType: 'NORMAL',
    sourceArtifact:
      'output/r2-bac-assets/bac/2011/pages/bac-exam-english-se-m-tm-ge-2011-normal',
    variants: [
      build2011SharedSujet1(),
      build2011SharedSujet2(),
    ],
  };
}

function build2010Le(): PaperSpec {
  return {
    slug: 'bac-english-le-2010-normal',
    title: 'بكالوريا 2010 - اختبار في مادة: اللغة الإنجليزية',
    year: 2010,
    sessionType: 'NORMAL',
    durationMinutes: 210,
    sourceArtifact:
      'output/r2-bac-assets/bac/2010/pages/bac-exam-english-le-2010-normal',
    variants: [
      build2010LeSujet1(),
      build2010LeSujet2(),
    ],
  };
}

function build2009Lp(): PaperSpec {
  return {
    slug: 'bac-english-lp-2009-normal',
    title: 'بكالوريا 2009 - اختبار في مادة: اللغة الإنجليزية',
    year: 2009,
    sessionType: 'NORMAL',
    sourceArtifact:
      'output/r2-bac-assets/bac/2009/pages/bac-exam-english-lp-2009-normal',
    variants: [
      build2009LpSujet1(),
      build2009LpSujet2(),
    ],
  };
}

function build2017LeMakeup(): PaperSpec {
  return {
    slug: 'bac-english-le-2017-makeup',
    title: 'بكالوريا 2017 الاستثنائية - اختبار في مادة: اللغة الإنجليزية',
    year: 2017,
    sessionType: 'MAKEUP',
    sourceArtifact:
      'output/r2-bac-assets/bac/2017/pages/bac-exam-english-le-2017-makeup',
    variants: [
      build2017LeMakeupSujet1(),
      build2017LeMakeupSujet2(),
    ],
  };
}

function build2017LpMakeup(): PaperSpec {
  return {
    slug: 'bac-english-lp-2017-makeup',
    title: 'بكالوريا 2017 الاستثنائية - اختبار في مادة: اللغة الإنجليزية',
    year: 2017,
    sessionType: 'MAKEUP',
    sourceArtifact:
      'output/r2-bac-assets/bac/2017/pages/bac-exam-english-lp-2017-makeup',
    variants: [
      build2017LpMakeupSujet1(),
      build2017LpMakeupSujet2(),
    ],
  };
}

function build2017SharedMakeup(): PaperSpec {
  return {
    slug: 'bac-english-se-m-tm-ge-2017-makeup',
    title: 'بكالوريا 2017 الاستثنائية - اختبار في مادة: اللغة الإنجليزية',
    year: 2017,
    sessionType: 'MAKEUP',
    sourceArtifact:
      'output/r2-bac-assets/bac/2017/pages/bac-exam-english-se-m-tm-ge-2017-makeup',
    variants: [
      build2017SharedMakeupSujet1(),
      build2017SharedMakeupSujet2(),
    ],
  };
}

function build2014LeSujet1(): ReviewedVariant {
  const prefix = 'le2014_s1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (14 points)', 14));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 points)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully and do the activities.',
      'All over the world, smoking in school is not isolated from what goes on in the streets and in the media. It is affected by advertising, smoking in public places and characters smoking on TV. All these are factors which show it as an acceptable part of our world. Children see parents, friends, teachers and many people doing it. So, this perception is carried into the classroom with them.',
      'The first cigarette is easily taken in a moment of pressure from friends, or classmates. Nobody likes to be bullied, ignored or to be the odd one out. Therefore, if you are offered something, it is better to go with the flow than to say no. Though smoking is, on the surface, kept as a secret at school, it is in reality the worst kept secret at all. Clothes and body smell, hideaways are littered with cigarette-ends, toilets bear testimony with burn marks and pupils are late for lessons.',
      'Teachers often don’t know how to tackle the problem by themselves. Currently, many of them are stressed and say that time to address issues like smoking is not available. However, an anti-smoking education is an initiative which needs to be acted on by the whole school staff. Some schools have strict regulations which prevent and punish smokers, but never see the light of day. That’s why what should be fostered and preached is a clear assumption that smoking is a real threat to pupils’ health and schooling.',
      'Jenny Jacobs. Ray. Soc. Health-February 1993 (Adapted)',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2,
      'Are these statements true or false? Write T or F next to the letter corresponding to the statement.\na. Imitation is the major cause that makes pupils smoke.\nb. Smoking can be kept secret.\nc. It has no harm on pupils’ schooling.\nd. Anti-smoking regulations must be applied in schools.',
      'a) T    b) F    c) F    d) T',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1,
      'Put the following sentences in the order they appear in the text.\na. Friends’ pressure is the principal factor of smoking in schools.\nb. Pupils need adults’ advice and guidance to avoid smoking.\nc. Smoking cannot be hidden.\nd. Media incites adolescents to smoke.',
      'd - a - c - b',
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      1.5,
      'Answer the following questions according to the text.\na. Why do school boys and girls smoke?\nb. What should be done to limit smoking in schools?',
      'a) Because they see their parents, teachers and others doing it.\nb) An anti-smoking education is needed.',
      '0.75 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      0.5,
      'Copy the letter that corresponds to the right answer.\nThe text is a:\na. letter    b. magazine article    c. survey',
      'b) magazine article',
      '0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      1.5,
      'Who or what do the underlined words refer to in the text?\na. them (§1)    b. it (§2)    c. which (§3)',
      'a) Children\nb) smoking\nc) initiative',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q6`,
      `${prefix}_comp`,
      7,
      'Question 6',
      0.5,
      'Give a title to the text.',
      'Smoking in schools.',
      '0.5 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 points)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1,
      'Find in the text words or phrases that are closest in meaning to the following:\na. separated (§1)    b. different (§2)    c. encouraged (§3)    d. menace (§3)',
      'a) isolated\nb) odd\nc) fostered\nd) threat',
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1,
      'Give the opposites of the following words keeping the same root.\nlegal - acceptable - effective - hopeful',
      'legal ≠ illegal\nacceptable ≠ unacceptable\neffective ≠ ineffective\nhopeful ≠ hopeless',
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1.5,
      'Rewrite sentence (b) so that it means the same as sentence (a).\n1. a. Governments should interfere to ban bad practices in schools.\n   b. It’s high time ........................................................\n2. a. If strict measures are not taken, the educational system will deteriorate.\n   b. Unless .................................................................\n3. a. I have a strong desire that all governments will ban cigarettes production.\n   b. I wish ..................................................................',
      '1. It’s high time governments interfered to ban bad practices in schools.\n2. Unless strict measures are taken, the educational system will deteriorate.\n3. I wish all governments would ban cigarettes production.',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1,
      'Ask the questions which the underlined words answer.\na. The headmaster is determined to ban cigarettes smoking in his school.\nb. Some teachers throw cigarette ends on the class floor.',
      'a) What is the headmaster determined to do in his school?\nb) Where do some teachers throw cigarette ends?',
      '0.5 x 2',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1,
      'Classify the words according to the number of their syllables.\nschooling - policy - affected - smoke',
      [
        ['one syllable', 'two syllables', 'three syllables'],
        ['smoke', 'schooling', 'policy\naffected'],
      ],
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q6`,
      `${prefix}_exploration`,
      6,
      'Question 6',
      1.5,
      'Re-order the following sentences to make a coherent paragraph.\na. more and more school boys and school girls smoke\nb. Smoking has spread among students at an alarming rate.\nc. because they imitate adults and T.V stars and want to prove their freedom.\nd. In spite of its dangerous effects on health,',
      '1-b    2-d    3-a    4-c',
      '0.5 x 3',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 6, [
    'Topic One:\nSmoking at school is bad and dangerous for teenagers. Write an article of about 120 to 150 words for your school magazine in which you warn your schoolmates against smoking.\nThe following notes may help you:\n- immediate health hazards: coughs, wheeziness, shortness of breath\n- poor academic performance, taking more time outside school\n- wasting money',
    'Topic Two:\nWrite a composition of about 120 to 150 words on the following:\nMany children around the world are engaged in child labour. State the causes and suggest the possible solutions to eradicate this phenomenon.',
  ], 'Topic One: form 3.5 pts; content 2.5 pts.\nTopic Two: form 3 pts; content 3 pts.');
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2014LeSujet2(): ReviewedVariant {
  const prefix = 'le2014_s2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (14 points)', 14));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 points)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully and do the activities.',
      'Sparta was one of the most important cities in Ancient Greece and it was a very different kind of city state. The life of the people of Sparta was a very strict one, similar to the military. The Spartans were proud, fierce and capable warriors. Young boys were taken from their homes at an early age to begin military training. Young girls were forced to maintain a healthy way of life in order to produce healthy children and were sent to school to learn how to fight and to become soldiers, too.',
      'Most Spartan citizens were either Perioeci (citizens who paid taxes, served in the army and were protected by Spartan laws) or Helots (people from lands conquered and ruled by Sparta who had no rights). Spartan citizens were given land which was farmed for them by the Helots. The Helots were treated as slaves and had to give half their crops to their Spartan master. It was a common belief that the Helots were public property. They were seen as the enemy even though they were actually slaves. The Helots sweated in the fields, but their resentment grew. Finally, they rose up and fought their Spartan masters and the fighting continued for many years. But the Spartans eventually gained victory and so became more powerful.',
      'The Spartans became wealthy through trading in luxury goods of gold, silver and other materials. Besides, they produced beautiful things as their wealth increased. Ivory carvings were desired across Greek lands, bronze-work and pottery were exported to Italy.',
      'Adapted from: greece.mrdonn.org',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      0.5,
      'Write the letter that corresponds to the right answer a, b or c.\nThe text is taken from a:\na. magazine    b. website    c. newspaper',
      'b) a website',
      '0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      2,
      'Are these statements true or false? Write T or F next to the letter corresponding to the statement.\na. Only Spartan male citizens were trained to fight.\nb. The Perioeci class was a wealthy one.\nc. The Helots uprose against the Spartans.\nd. No great works of art came from Sparta.',
      'a) F    b) T    c) T    d) F',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      1,
      'In which paragraph is it mentioned that...\na. the Helots were considered a permanent threat by the Spartans?\nb. the Spartans led a severe military life?',
      'a) §2\nb) §1',
      '0.5 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      2.25,
      'Answer the following questions according to the text.\na. What was the Spartan’s life like?\nb. How were the Helots treated?\nc. What made Sparta a rich city state?',
      'a) It was a very strict one, similar to the military.\nb) They were considered as slaves / maltreated.\nc) Trading in luxury goods of gold, silver and other materials.',
      '0.75 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      0.5,
      'Copy the letter that corresponds to the right answer.\nThe text is:\na. prescriptive    b. narrative    c. argumentative',
      'b) narrative',
      '0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q6`,
      `${prefix}_comp`,
      7,
      'Question 6',
      0.75,
      'Who or what do the underlined words refer to in the text?\na. one (§1)    b. they (§2)    c. their (§3)',
      'a) life\nb) Helots\nc) Spartans',
      '0.25 x 3',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 points)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1,
      'Find in the text words or phrases that are closest in meaning to the following:\na. violent (§1)    b. governed (§2)    c. hatred (§2)    d. commerce (§3)',
      'a) fierce\nb) ruled\nc) resentment\nd) trading',
      '0.25 x 4',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Complete the chart as shown in the example.',
      [
        ['Verb', 'Noun', 'Adjective'],
        ['to differ', 'difference', 'different'],
        ['to strengthen', '////', 'strong'],
        ['////', 'creation / creativity / creator', 'creative'],
        ['to free', 'freedom', '////'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1.5,
      'Combine the pairs of sentences using the connectors provided. Make the necessary changes.\nprovided that - as well as - although - because\na. Young girls were forced to maintain a healthy way of life. They had to produce healthy children.\nb. The Helots fought for their freedom. They were defeated.\nc. Our economy flourishes. We enhance agriculture.',
      'a) Young girls were forced to maintain a healthy way of life because they had to produce healthy children.\nb) Although the Helots fought for their freedom, they were defeated.\nc) Our economy will/can flourish provided that we enhance agriculture.',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1,
      'Give the correct form of the verbs between brackets:\na. If the Spartans hadn’t given much importance to their soldiers they (not/to make) a strong army.\nb. After the Spartans (to defeat) the Helots, they became much more powerful.',
      'a) would not have made\nb) had defeated',
      '0.5 x 2',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1,
      'Classify the following words according to the pronunciation of the final “s”.\nboys - warriors - barracks - businesses',
      [
        ['/s/', '/z/', '/iz/'],
        ['barracks', 'boys\nwarriors', 'businesses'],
      ],
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q6`,
      `${prefix}_exploration`,
      6,
      'Question 6',
      1,
      'Fill in the gaps with words from the list.\nSpartans - time - army - obedience - emphasized - girls\nAncient Sparta gave such a big importance to its ...(1)... that all the boys were brought up in a way that ...(2)... their physical fitness, courage and ...(3).... Only very little ...(4)... was devoted to leisure or family life.',
      '1) army    2) emphasized    3) obedience    4) time',
      '0.25 x 4',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 6, [
    'Topic One:\nUsing the following notes, write a composition of 120 to 150 words to describe the daily life of the people of ancient Greece.\n- houses: built, clay-brick, stone, more than one room, a courtyard\n- food: varied, fruits, vegetables, fish, rarely eat meat only in religious feasts\n- clothes: home-made, decorated to represent their city-states\n- entertainment: dance, music ...............',
    'Topic Two:\nCounterfeiting and piracy lead to negative effects. Write a composition of 120 to 150 words about the impact of such practices on people’s life.',
  ], 'Topic One: form 3.5 pts; content 2.5 pts.\nTopic Two: form 3 pts; content 3 pts.');
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function build2012LeSujet1(): ReviewedVariant {
  const prefix = 'le2012_s1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (14 points)', 14));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 points)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the activities.',
      'In sports, the use of performance-enhancing drugs is referred to by the term “doping”, particularly by those organizations that regulate competitions. The use of performance-enhancing drugs is typically done to get better athletic performance. This is why many sports organizations prohibit the use of performance-enhancing drugs.',
      'The use of enhancement “substances” for sporting purposes dated back to the ancient Maya and ancient Greece. Performance enhancements in the form of potions were utilized by the people of both civilizations, who were thought to use coca leaves to improve their abilities. Today’s athletes have many options, including: Steroids, Amphetamines, and many other issues.',
      'Most international sports organizations consider the use of drugs to enhance performance unethical although ethicists continue to argue that it is little different from the use of new materials in the construction of suits and sporting equipments, which in the same way, aid performance and can give competitors advantage over others.',
      'Most athletes use performance-enhancing drugs for a number of reasons such as reducing weight, dulling the pain response in the body, building muscles at an accelerated rate, lowering stress, and even hiding other drugs that may be in the system. These drugs are used for each of these purposes and some athletes are taking daily doses which consist of a variety of steroids and growth supplements. Yet, most athletes are risking their lifetime health for a temporary condition just to win the game. This fact is being neglected by both athletes and coaches.',
      'www.helium.com',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2,
      'Are these statements true or false? Write T or F next to the letter corresponding to the statement.\na. Doping can improve sport results.\nb. The use of performance-enhancing drugs is a recent practice.\nc. Some of these drugs reduce stress.\nd. Steroids represent a real threat for athletes.',
      'a) T    b) F    c) T    d) T',
      '0.5 x 4',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1,
      'Fill in the table with information from the text.',
      [
        ['Reasons of doping', 'Doping options'],
        ['reducing weight; dulling pain; building muscles; lowering stress; hiding other drugs', 'steroids; amphetamines; cocoa leaves'],
      ],
      '0.25 x 4; accept any two correct answers for each',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      2.5,
      'Answer the following questions according to the text.\na. What do athletes use performance-enhancing drugs for during competitions?\nb. How is the use of performance-enhancing drugs considered by sports organizations?\nc. Is performance-enhancing drug-taking harmful? Justify your answer.',
      'a) Athletes use performance-enhancing drugs for getting / to get better athletic performance, to obtain good sports results, to win the game, or to break records.\nb) They are considered as unethical / prohibited.\nc) Yes, it is. Most athletes are risking their lifetime health.',
      'a) 1 pt    b) 0.75 pt    c) 0.75 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1,
      'Read the text and put the following sentences in the order they appear in the text.\na. Doping is dishonest because it favours athletes over others.\nb. The consumption of performance-enhancing drugs is not without risks.\nc. Sport regulations are against the consumption of performance-enhancing drugs.\nd. Body-building uses drugs to quicken the development of muscles.',
      'c - a - d - b',
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      0.5,
      'Give a title to the text.',
      'Doping / Doping and sports / Ethics in Sports.',
      '0.5 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 points)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words that are opposite in meaning to the following:\na. permit (§1)    b. hinder (§3)    c. drawback (§3)',
      'a) prohibit\nb) aid\nc) advantage',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Give the opposites of the following words keeping the same root.\nregulate - risky - harmful',
      'regulate ≠ deregulate\nrisky ≠ unrisky\nharmful ≠ harmless',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      2,
      'Rewrite sentence (b) so that it means the same as sentence (a).\n1. a) Some athletes are taking daily doses of steroids.\n   b) Daily doses of steroids .................................................\n2. a) Tests had revealed that Carl Lewis cheated; that’s why he was disqualified from the competition.\n   b) Because of .............................................................\n3. a) “Have athletes encountered any pressure?” the journalist said.\n   b) The journalist asked ....................................................\n4. a) It’s high time sport organizations passed strict anti-doping laws.\n   b) Sport organizations .....................................................',
      '1. Daily doses of steroids are being taken by some athletes.\n2. Because of cheating / because of his cheating, Carl Lewis was disqualified from the competition.\n3. The journalist asked if / whether athletes had encountered some pressure.\n4. Sport organizations had better / should / ought to pass strict anti-doping laws.',
      '0.5 x 4',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1,
      'Classify the following words according to their stressed syllables.\nnecessity - ethical - competition - sportsmen',
      [
        ['1st syllable', '2nd syllable', '3rd syllable'],
        ['ethical\nsportsmen', 'necessity', 'competition'],
      ],
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1,
      'Fill in the gaps with only FOUR words from the list.\ngame - doping - practice - earn - athletic - victory\nStar athletes know that training paves the way to ...(1).... They can ...(2)... a lot of money and gain fame. However, they should be aware that ...(3)... can boost their effort and give them shortcut even if they risk their health and their ...(4)... career.',
      '1) victory    2) earn    3) doping    4) athletic',
      '0.25 x 4',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 6, [
    'Topic One:\nYou are a fan of a famous sportsman. Unfortunately, you have found out he won the game by using drugs (doping).\nUsing the following notes, write a composition of 120-150 words in which you urge athletes to show the sense of fair-play.\n- doping in competitions: dishonest - unethical\n- respect sports laws / game rules\n- be careful: anti-dope tests; disqualification / penalties; bad reputation / career compromised',
    'Topic Two:\nWrite a composition of 120-150 words on the following:\nImagine one of your classmates cheated at an exam to get higher grades. What advice would you give in order to refrain him/her from behaving in such a way?',
  ], 'Topic one: form 3.5 pts; content 2.5 pts.\nTopic two: form 3 pts; content 3 pts.');
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2012LeSujet2(): ReviewedVariant {
  const prefix = 'le2012_s2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (14 points)', 14));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 points)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the activities.',
      'Dr Gerald Gary is the principal of Jackson school in Camden, South California which has a high number of students receiving free and reduced-price lunches, an indicator of low-income families. He found that parents and the community did not have the same expectations for their children as those in other schools. Gary knew his students could do better; he had just to convince them and their families. He improved student achievement and changed the school’s culture by setting high expectations for everyone in the building.',
      'Concerned that his students’ parents had lower expectations for their children than parents in other communities, Gary introduced parents at his school to research about the effect of parental involvement on student achievement. Soon parents began to take more than an interest in what students were learning at school and at home.',
      'Gary began holding meetings for parents during which he presented data showing that when parents get involved with their children’s education, achievement increases. He talked about the importance of reading to children at home and checking their homework regularly, noting that these efforts have a positive effect on students performance. He showed them data from schools with the same background as theirs and how they could get similar results. The Jackson school parents couldn’t say their children were not doing well because of poverty.',
      'After about a year, the school staff started seeing gradual achievement growth, and now the school holds parent workshops six or seven times a year on topics such as how to help children with reading, maths and science.',
      'Adapted from Article by Ellen R. Delisio, “Education World”, 2009.',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      0.5,
      'Choose the general idea of the text.\na. Applying high expectations to Jackson students.\nb. Parents’ work in South California.\nc. The principal describes the curriculum of Jackson school.',
      'a) Applying high expectations to Jackson students.',
      '0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      2,
      'Are these statements true or false? Write T or F next to the letter corresponding to the statement.\na. The principal Dr Gerald Gary received free lunches at Jackson school.\nb. Thanks to principal Gary, parents started to show more interest in their children’s studies.\nc. Checking homework doesn’t have any effect on the student’s performance.\nd. Parents are convinced that their children’s bad results were due to poverty.',
      'a) F    b) T    c) F    d) F',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      0.5,
      'In which paragraph is it mentioned that:\nGary urged parents to help their children at home?',
      '§3',
      '0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1.5,
      'Read the text and put the following sentences in the order they appear in the text.\na. The students’ results at Jackson gradually got better.\nb. Students in Jackson school come from poor families.\nc. Parents were actively involved in their children’s studies.',
      'b - c - a',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      2,
      'Answer the following questions according to the text.\na. What did the principal Gary do to reach his objective?\nb. Why did Gary have to convince the parents to get involved in their children’s education?\nc. How can the parents help their children at home?',
      'a) He introduced parents at school to research about the effect of parental involvement.\nb) Because he knew his students could do better / he wanted to improve students’ achievement and change the school’s culture.\nc) By checking their homework and making them read.',
      'a) 0.5 pt    b) 1 pt    c) 0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q6`,
      `${prefix}_comp`,
      7,
      'Question 6',
      0.5,
      'What or who do the underlined words refer to in the text?\na. them (§1)    b. which (§3)',
      'a) students\nb) meetings',
      '0.25 x 2',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 points)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1,
      'Find in the text words whose definitions follow.\na. to study carefully to find out new facts (§2)\nb. process of teaching, training and learning (§3)\nc. details of a person’s family, education, etc. (§3)\nd. team working together in an organization (§4)',
      'a) research\nb) education\nc) background\nd) staff',
      '0.25 x 4',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Complete the table as shown in the example.',
      [
        ['Verb', 'Noun', 'Adjective'],
        ['to reduce', 'reduction', 'reducible'],
        ['///', 'knowledge', 'known / knowing / knowledgeable'],
        ['to educate', '///', 'educative / educational / educated'],
        ['to grade / graduate', 'grade / graduation', '///'],
      ],
      '0.5 x 3, one line each',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1,
      'Ask the questions which the underlined words answer.\na. Three years ago, Gary held meetings for parents in his school.\nb. Parents have to check their children’s homework regularly.',
      'a) How long ago did Gary hold meetings for parents in his school?\nb) How often have parents to check their children’s homework?',
      '0.5 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1.5,
      'Rewrite sentence (b) so that it means the same as sentence (a).\n1. a) “Parents must focus on positive things,” Gary said.\n   b) Gary said that .........................................................\n2. a) The school holds parents workshops.\n   b) Parents workshops ......................................................\n3. a) Jackson school students were of low-income but they managed to get high scores.\n   b) Although ................................................................',
      '1. Gary said that parents had to focus on positive things.\n2. Parents workshops are held by the school.\n3. Although Jackson school students were of low-income, they managed to get high scores.',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1,
      'Underline the silent letter in each of the following words.\nknew - higher - honesty - talked',
      'k in knew; gh in higher; h in honesty; l in talked',
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q6`,
      `${prefix}_exploration`,
      6,
      'Question 6',
      1,
      'Reorder the following sentences to make a coherent paragraph.\na. Some of them succeed and access to various universities.\nb. In Jackson school, children follow a compulsory education till the age of sixteen.\nc. or simply become delinquents.\nd. However, others fail and, either go to a technical training',
      'b - a - d - c',
      '0.25 x 4',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 6, [
    'Topic One:\nWrite a composition of 120-150 words on the following topic. Use the notes below:\nFailure at school has become a world wide issue. What are its consequences and what solutions do you suggest?\nConsequences:\n- delinquency / increase in the rate of crimes\n- unemployment / exploitation / child labour\n- no future prospects / illegal immigration\n- family, society deeply worried\nSolutions:\n- improve educational system\n- rehabilitate school leavers\n- build more schools, training centres, youth clubs',
    'Topic Two:\nSuppose you were a historian, write a composition of 120-150 words stating how most ancient civilizations rose, flourished and declined.',
  ], 'Topic one: form 3.5 pts; content 2.5 pts.\nTopic two: form 3 pts; content 3 pts.');
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function build2011LeSujet1(): ReviewedVariant {
  const prefix = 'le2011_s1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (14 points)', 14));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 points)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the following activities.',
      'The old cities of Egypt have disappeared from the face of the earth. Nineveh and Babylon are deserted mounds of dust and brick. One city alone has survived the ages. It is called Damascus.',
      'Damascus was a fortified frontier town of the Amorites, those famous desert people who had given birth to the great King Hammurabi. When the Amorites moved further eastward into the valley of Mesopotamia to establish the Kingdom of Babylon, Damascus had continued to be a trading post with the wild Hittites who inhabited the mountains of Asia Minor. Later, the earliest inhabitants had been absorbed by another tribe, called the Aramaeans. They were semi-nomadic and pastoralist people. The city itself, however, had not changed its character. It remained an important center of commerce thanks to its geographical situation. It traded with the entire world and offered a safe home to the merchant and to the artisan. Incidentally it spread its language all over western Asia.',
      'Commerce has always demanded quick and practical ways of communication between different nations. The Aramaean business man found it difficult to use the elaborate system of nail-writing of the ancient Sumerians, so he invented a new alphabet which could be written much faster than the old wedge-shaped figures of Babylon.',
      'The spoken language of the Aramaeans, Aramaic, became the language of the merchants and of the simple people of the old Mediterranean world. In most parts of Mesopotamia, it was understood as readily as the native tongue.',
      'Adapted from Ancient Man: The Beginning of Civilizations by H.W. Van Loon',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2,
      'Say whether the following statements are True or False according to the text.\na. Damascus has disappeared from the face of the earth.\nb. King Hammurabi was an Amorite.\nc. Damascus was an insecure city.\nd. Aramaic was widely used in Mesopotamia.',
      'a) F    b) T    c) F    d) T',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1,
      'In which paragraph is it mentioned that...\na. Damascus was a well-protected town?\nb. The Aramaeans invented a new language?',
      'a) §2\nb) §3',
      '0.5 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      2.5,
      'Answer the following questions according to the text.\na. Why did the Amorites move eastward?\nb. What made Damascus an important center of commerce?\nc. Why did the Aramaean business man invent a new alphabet?\nd. Give some reasons why Damascus hasn’t disappeared and has survived the ages.',
      'a) To establish the kingdom of Babylon.\nb) Its geographical situation.\nc) Because he found it difficult to use the elaborate system of nail-writing of the ancient Sumerians.\nd) It was a fortified frontier town; it had a strategic geographical situation; it was an important commercial centre.',
      'a) 0.5 pt    b) 0.5 pt    c) 0.5 pt    d) 1 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1,
      'What or who do the underlined words refer to in the text?\na. They (§2)    b. The city (§2)    c. he (§3)    d. it (§4)',
      'a) The Aramaeans\nb) Damascus\nc) The Aramaean business man\nd) Aramaic',
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      0.5,
      'Choose the most appropriate title to the text.\na. The Old Cities of Egypt\nb. Damascus: The City of Trade\nc. The Aramaeans\nd. The Amorites',
      'b) Damascus: The City of Trade.',
      '0.5 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 points)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      2,
      'Find in the text words that are closest in meaning to the following.\na. vanished (§1)\nb. lived in (§2)\nc. secure (§2)\nd. very old (§3)',
      'a) disappeared\nb) inhabited\nc) safe\nd) ancient',
      '0.5 x 4',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Complete the following chart as shown in the example.',
      [
        ['Verb', 'Noun', 'Adjective'],
        ['to establish', 'establishment', 'established'],
        ['to save', 'safety', 'safe'],
        ['to commercialize', 'commerce', 'commercial'],
        ['to move', 'movement', 'movable'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1,
      'Choose the appropriate connector to join the following pairs of sentences. Make changes where necessary.\nif - despite the fact that - while - therefore\na. Damascus was a fortified town. It was conquered by Alexander the Great.\nb. They invented a new alphabet. They could not use the Ancient Sumerians’ writing.',
      'a) Despite the fact that Damascus was a fortified town, it was conquered by Alexander the Great.\nb) They could not use the Ancient Sumerians’ writing; therefore they invented a new alphabet.',
      '0.5 x 2',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1,
      'Classify the following words according to the number of their syllables.\na. desert    b. mounds    c. difficult    d. another',
      [
        ['One syllable', 'Two syllables', 'Three syllables'],
        ['mounds', 'desert', 'difficult\nanother'],
      ],
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1.5,
      'Reorder the following sentences to make a coherent paragraph.\na. They established the water distribution system of the city\nb. When the Aramaeans entered Damascus,\nc. by constructing canals and tunnels.\nd. they noticed the agricultural potential of the area.',
      '1-b    2-d    3-a    4-c',
      '0.5 x 3; count the couple',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 6, [
    'Topic one:\nUsing the following notes, write a composition of about 120 to 150 words explaining why Damascus was an important city.\nnear the river / near the trade routes / centre of commerce / safe town...',
    'Topic two:\nWrite a composition of about 120 to 150 words on the following topic.\nA number of clothes manufactures are developing exploiting children (physically, mentally, morally, having no respect for their rights). Would you boycott their products even if you know they are the cheapest on the market?',
  ], 'Topic 1: form 3.5 pts; content 2.5 pts.\nTopic 2: form 3 pts; content 3 pts.');
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2011LeSujet2(): ReviewedVariant {
  const prefix = 'le2011_s2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (14 points)', 14));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 points)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the following activities.',
      'All the children in the United States have to receive an education, but the law does not say they have to be educated at school. A number of parents prefer not to send their children to school. Children who are educated at home are known as “home-schoolers”. There are about 300,000 home-schooled children in the United States today.',
      'David and his wife teach their three children at home. David says that his children learn differently from children in school. Learning starts with the children’s interests and questions. For example when there is a heavy snowfall on a winter day, it may start a discussion or reading about climate, snow removal-equipment, Alaska polar bears, and winter tourism. On a spring day evening the family is out watching the stars, it is then a good opportunity to ask questions about space program. If the Brazilian rain forests are on TV news, it could be a perfect time to talk about how rain forests influence the climate, how deserts are formed, and how the polar ice caps affect ocean levels.',
      'Home-schooling is often more interesting than regular schools, but critics say that home-schoolers might find it difficult to mix with other people in adult life. Critics also say that most parents are not well qualified to teach their children. Furthermore, most parents don’t have time or the desire to teach their children at home, so schools will continue to be where most children get their formal education.',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      0.25,
      'The text is...\na. narrative\nb. expository\nc. descriptive',
      'b) expository',
      '0.25 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      2,
      'Say whether the following statements are True or False according to the text.\na. Education at school is not obligatory in the USA.\nb. Children can receive their education at home.\nc. Parents teach their children in the same way as teachers do in schools.\nd. Learning at home is related to daily life.',
      'a) T    b) T    c) F    d) T',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      0.5,
      'In which paragraph are the disadvantages of home-schooling mentioned?',
      '§3',
      '0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      3,
      'Answer the following questions according to the text.\na. List some of the topics that are taught at home.\nb. What advantages can home-schooling give to children?\nc. What problem might home-schoolers face when they become adults?',
      'a) Climate, space, environment.\nb) It associates learning with their daily life. It broadens their knowledge.\nc) They might find it difficult to mix with other people.',
      '1 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      0.75,
      'What or who do the underlined words refer to in the text?\na. they (§1)\nb. it (§3)\nc. their (§3)',
      'a) children in the U.S.\nb) to mix with other people\nc) most parents',
      '0.25 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q6`,
      `${prefix}_comp`,
      7,
      'Question 6',
      0.5,
      'Give a title to the text.',
      'Home-schooling in the U.S.',
      '0.5 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 points)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1,
      'Find in the text words closest in meaning to the following.\na. nearly (§1)\nb. begins (§2)\nc. chance (§2)\nd. hard (§3)',
      'a) about\nb) starts\nc) opportunity\nd) difficult',
      '0.25 x 4',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Complete the following chart as shown in the example.',
      [
        ['Verb', 'Noun', 'Adjective'],
        ['educate', 'education', 'educational'],
        ['to differ', 'difference', 'different'],
        ['to influence', 'influence', 'influential'],
        ['criticize', 'critic', 'critical'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      2,
      'Complete sentence (b) so that it means the same as sentence (a).\n1. a. It is advisable that parents send their children to school.\n   b. Parents ..............................................................\n2. a. They will refuse your justifications unless you convince them.\n   b. If ....................................................................\n3. a. I regret not having learnt how to play a musical instrument when I was a child.\n   b. I wish .................................................................',
      '1. Parents should send their children to school.\n2. If you convince them, they will not refuse your justifications. / If you don’t convince them, they will refuse your justifications.\n3. I wish I had learnt how to play a musical instrument when I was a child.',
      '2 pts: 0.5, 0.75, 0.75',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1.5,
      'Classify the following words according to the pronunciation of their final “ed”.\neducated - received - included - mixed - preferred - picked',
      [
        ['/t/', '/d/', '/id/'],
        ['mixed\npicked', 'received\npreferred', 'educated\nincluded'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1,
      'Fill in the gaps with words from the list.\nclassroom - either - children - home\nIn England, many children do not go to school ...(1)... because their parents want them at ...(2)... as careers for ...(3)... or simply because their parents can’t be bothered to send them. The Ministry of Education has introduced drastic laws to bring truant and excluded children back into the ...(4)....',
      '1) either    2) home    3) children    4) classroom',
      '0.25 x 4',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 6, [
    'Topic one:\nUsing the following notes, write a composition of about 120 to 150 words on the objectives of education.\n- broaden one’s knowledge\n- provide skillful workforce\n- create a good citizen\n- establish contact with other civilizations',
    'Topic two:\nWrite a composition of about 120 to 150 words on the following topic.\nExplain how wars, internal conflicts and natural disasters led to the disappearance of ancient civilizations.',
  ], 'Topic 1: form 3.5 pts; content 2.5 pts.\nTopic 2: form 3 pts; content 3 pts.');
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function build2011SharedSujet1(): ReviewedVariant {
  const prefix = 'shared2011_s1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (15 points)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (08 pts)', 8));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully and do the activities.',
      'According to Webster’s Dictionary, advertising is the activity of calling something to the attention of the public, especially by paid announcements. In the U. S., people who have products or services to sell usually advertise them through television, radio, newspapers, World Wide Web, magazines, books or through words and pictures on various objects found in the world around us. Advertisers master the power of argument. They do this by convincing the public that the product they are advertising will improve their lives.',
      'Persuasion, which is the objective of advertising, is defined as the ability to convince others of your own opinion. Therefore, in a way, good persuaders have mastered the power of argument. Each year, U.S. businesses spend 135 billion dollars on TV, radio, and print ads. About one fourth of every television hour consists of advertising, and over 50% of most magazines and billboards consist of advertising. Advertising helps us attain feelings of youth, social acceptance, intimacy and power. It uses images and words to get these themes across.',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2,
      'Say whether the following statements are true or false.\na) In the USA, people selling products never advertise through the media.\nb) The power of argument is mastered by advertisers to convince the public.\nc) Persuasion is the capacity of convincing others.\nd) Less than 50% of magazines and billboards consist of advertising.',
      'a) F    b) T    c) T    d) F',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      3.5,
      'Answer the following questions according to the text.\na) What is advertising?\nb) How can advertisers convince the public that the product they are selling will improve their lives?\nc) What does advertising use to reach the feelings of youth?',
      'a) Advertising is the activity of calling something to the attention of the public.\nb) By the mastering of the power of argument / through persuasion.\nc) By using images and words.',
      'a) 1 pt    b) 1.5 pts    c) 1 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      1,
      'In which paragraph is it mentioned that persuasion is the ability to convince others?',
      '§2',
      '1 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1.5,
      'What or who do the underlined words refer to in the text?\na) them (§1)    b) which (§2)    c) It (§2)',
      'a) products or services\nb) persuasion\nc) advertising',
      '0.5 x 3',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 pts)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1,
      'Find in the text words whose meanings are closest to the following.\na) persuading (§1)    b) item (§1)    c) aim (§2)    d) reach (§2)',
      'a) convincing\nb) product\nc) objective\nd) attain',
      '0.25 x 4',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Complete the following table.',
      [
        ['Verb', 'Noun', 'Adjective'],
        ['to persuade', 'persuasion', 'persuasive / persuadable'],
        ['to consume', 'consumption / consumer', 'consuming'],
        ['to vary', 'variety', 'various'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1.5,
      'Rewrite sentence (b) so that it means the same as sentence (a).\n1.a) “Advertisers master the power of argument.” he says.\n1.b) He says that ........................................................\n2.a) Persuasion is defined as the ability to convince others of your own opinion.\n2.b) We ..................................................................',
      '1.b) He says that advertisers master the power of argument.\n2.b) We define persuasion as the ability to convince others of your own opinion.',
      '0.75 x 2',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1.5,
      'Classify the following words according to the pronunciation of their final "ed".\ndescribed - persuaded - helped - defined - produced - consisted',
      [
        ['/t/', '/d/', '/id/'],
        ['helped\nproduced', 'described\ndefined', 'persuaded\nconsisted'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1.5,
      'Complete what A says.\nA: ........................................................?\nB: People who have products or services to sell.\nA: ........................................................?\nB: By paid announcements through TV, radio and newspapers.\nA: ........................................................?\nB: To convince the public that the product will improve their lives.',
      'A1) Who uses advertising?\nA2) How do they advertise their products?\nA3) Why do they do so?\nAccept any suitable rejoinders.',
      '0.5 x 3',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 5, [
    'Topic One:\nUsing the notes below, write a composition of 120 to 150 words on the following topic:\nWhat should be done to make the Algerian products more competitive?\n- quality of products\n- reasonable prices\n- giving importance to packaging\n- good marketing\n- efficient advertising',
    'Topic Two:\nYou bought the last genuine expensive mobile. Later you discovered it was a counterfeit product. You are disappointed and you decide to complain. Write the letter of complaint. Send it to Mr. Amrouche, Head of the department store. Sign it Mohammed Benokba.',
  ], 'Topic 1: form = 3 pts; content = 2 pts.\nTopic 2: form = 2.5 pts; content = 2.5 pts.');
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2011SharedSujet2(): ReviewedVariant {
  const prefix = 'shared2011_s2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'PART ONE: Reading (15 points)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (08 pts)', 8));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Scientists announced tonight that they have “buckets” of water on the Moon following the analysis of data from a spacecraft that was deliberately crashed into a lunar crater last month.',
      'The researchers said the evidence for the existence of significant bodies of water ice hidden in polar craters on the Moon is “definitive” and that the total quantities could be big enough to support a permanently-manned lunar base.',
      'It is the first time that the US National Aeronautics and Space Administration (NASA) have been so categorical about the discovery of water on the Moon. Previous studies had only suggested that the presence of water might be possible and then only in trace amounts.',
      'One of the unsolved questions is how the water could have got to the Moon. One theory is that it arrived on a comet and never evaporated in the shaded polar craters where temperature is minus 220C.',
      'NASA estimates that there are 12,500 square kilometers of permanently-shadowed terrain on the Moon and if the top one meter of this area were to hold just 1% by mass of water, this would still produce thousands of liters of water.',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2,
      'Say whether the following statements are true or false.\na) Scientists announced the existence of water on the Moon.\nb) Previous studies suggested that water might exist in abundance.\nc) One of the mysteries is how water could exist on the Moon.\nd) Due to the warm climate the water never evaporated.',
      'a) T    b) F    c) T    d) F',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      3,
      'Answer the following questions according to the text.\na) How could scientists know about the existence of water on the Moon?\nb) How could water have got to the Moon?',
      'a) By the analysis of data from a spacecraft that deliberately crashed into a lunar crater last month.\nb) The theory is that it arrived on a comet and never evaporated.',
      '1.5 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      1,
      'In which paragraph is it mentioned that scientists have already studied the problem of water on the Moon?',
      '§3',
      '1 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1.5,
      'What or who do the underlined words refer to in the text?\na) they (§1)    b) it (§4)    c) where (§4)',
      'a) scientists\nb) water\nc) craters',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      0.5,
      'Choose the right title.\na) Life on the Moon    b) Water on the Moon    c) A Trip to the Moon',
      'b) Water on the Moon',
      '0.5 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 pts)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1,
      'Find in the text words that are opposite in meaning to the following.\na) shown (§2)    b) recent (§3)    c) plus (§4)    d) temporarily (§5)',
      'a) hidden\nb) previous\nc) minus\nd) permanently',
      '0.25 x 4',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      2,
      'Divide the following words into roots and affixes.\ndeliberately - unsolved - categorical - shadowed',
      [
        ['Prefix', 'Root', 'Suffix'],
        ['de', 'liberate', 'ly'],
        ['un', 'solve', 'd'],
        ['/', 'category', 'cal'],
        ['/', 'shadow', 'ed'],
      ],
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1.5,
      'Rewrite sentence (b) so that it means the same as sentence (a).\n1.a) “Can we live on the Moon?” she asks.\n1.b) She asks ............................................................\n2.a) Scientists discovered water on the Moon.\n2.b) Water ...............................................................',
      '1.b) She asks if / whether we can live on the Moon.\n2.b) Water was discovered on the Moon by scientists.',
      '0.75 x 2',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1.5,
      'Classify the following words according to the number of their syllables.\nmoon - discover - crater - space - evidence - previous',
      [
        ['1 syllable', '2 syllables', '3 syllables'],
        ['moon\nspace', 'crater\nprevious', 'discover\nevidence'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1,
      'Fill in the gaps with words from the list below.\nworkers - job - build - spacecraft\nSpace walking seems like a really exciting ........, but astronauts called space walkers the construction ........ of outer space. When an astronaut goes outside of his ........ it is usually to repair or to ........ something on the outside of the spaceship.',
      '1) job    2) workers    3) spacecraft    4) build',
      '0.25 x 4',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 5, [
    'Topic One:\nUsing the notes below, write a composition of about 120 to 150 words on the following:\nCan Man one day live on the Moon? Say why?\n- not enough water\n- not enough oxygen\n- no interesting places to visit\n- no amenities\n- no entertainment, etc',
    'Topic Two:\nIn what sense is water vital to man, plants and animals?',
  ], 'Topic 1: form = 3 pts; content = 2 pts.\nTopic 2: form = 2.5 pts; content = 2.5 pts.');
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function build2010LeSujet1(): ReviewedVariant {
  const prefix = 'le2010_s1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (14 points)', 14));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 points)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the activities.',
      'Each of the great civilizations of the past contributed some way or another to enhance the technical level of human communities. They all achieved realizations that gradually transformed the destiny of nations and turned them to highly organized groups, having in their hands more efficient means that enabled them to develop a better capacity in the fight for survival and therefore to lead a more comfortable life.',
      'The Chinese, for example, were among the first people to show to the others how to combine intelligence and discipline in order to construct a dynamic society able to offer to its inhabitants prosperity and security. The Egyptians in their turn managed to bring considerable improvements in the branches of farming, architecture, medicine, writing and religion. Despite the hostile environment where they evolved they succeeded to impose their will-power and perseverance so as to win the respect of their neighbours and immortalize their name in history.',
      'As regards the Babylonians, they devoted their skills to further the spheres of astronomy, law-making, building, cattle-breeding, and land-working. The Phoenicians, too, helped in accomplishing exceptional advances in matters connected with ship-building, international trade and sailing across seas. When the Greeks arrived, they promoted mathematics, philosophy, and democracy. They also gave a strong impetus to scientific research, rational thinking, mythology and artistic creations. In their wisdom they went as far as using sport as a channel through which to consolidate peace and harmony among tribes and races. The Romans as well applied themselves for elevating the fate of the human race. They dedicated their talent for the pursuit of art, the construction of towns and public works, the laying of rules and political bodies, the expansion of commerce and the introduction of more effective strategies in the military field.',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      1,
      'Choose a title to the text.\na) Conflict of Civilizations\nb) The Achievements of Past Civilizations\nc) The Supremacy of the Egyptian Civilization',
      'b) The Achievements of Past Civilizations',
      '1 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1.5,
      'Say whether the following statements are True or False according to the text.\na) Today’s civilization does not draw any advantages from the cultures of the past.\nb) The Phoenicians were expert at attacking the other nations in the sea.\nc) The Greeks encouraged their people to practise sport to consolidate peace.',
      'a) F    b) F    c) T',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      1.5,
      'Classify the following ideas according to their occurrence in the text.\na) Games and sports were used to set up friendly relations among tribes.\nb) The accomplishments of the ancient people helped in the progress of human societies in various fields.\nc) Intelligence and discipline constructed a dynamic and secure nation.\nd) The Greeks brought to mankind logical thinking.',
      'b - c - d - a',
      '0.75 pt for the first item; 0.25 pt for each following item',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      2,
      'Answer the following questions according to the text.\na) List some of the main realizations of the Babylonian civilization.\nb) How did the Chinese contribute in advancing mankind?',
      'a) They devoted their skills to further the spheres of astronomy, law-making, building, cattle-breeding and land-working.\nb) They were among the first people to show to the others how to combine intelligence and discipline in order to construct a dynamic society.',
      '1 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      1,
      'In which paragraph is it mentioned that civilizations influenced one another?',
      '§1',
      '1 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 points)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      0.75,
      'Find in the text words or phrases closest in meaning to the following.\na) accomplishments (§1)    b) build (§2)    c) extraordinary (§3)',
      'a) realizations\nb) construct\nc) exceptional',
      '0.25 x 3',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Complete the following chart as shown in the example.',
      [
        ['Verb', 'Noun', 'Adjective'],
        ['civilize', 'civilization', 'civilized'],
        ['to introduce', 'introduction', 'introductory'],
        ['to dedicate', 'dedication', 'dedicated'],
        ['to persevere', 'perseverance', 'perseverant'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1,
      'Ask the questions that the underlined words answer.\na) The Egyptians managed to bring considerable improvements.\nb) The Greeks brought artistic creations.',
      'a) Who managed to bring considerable improvements?\nb) What did the Greeks bring?',
      '0.5 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1,
      'Complete sentence (b) so that it means the same as sentence (a).\n1.a) The Greeks promoted mathematics, philosophy and democracy.\n1.b) Mathematics, philosophy and democracy ................................\n2.a) He admitted that they had succeeded to impose themselves.\n2.b) “........................................................” he admitted.',
      '1.b) Mathematics, philosophy and democracy were promoted by the Greeks.\n2.b) “They succeeded to impose themselves,” he admitted. / “They have succeeded to impose themselves,” he admitted.',
      '0.5 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1.25,
      'Complete the following dialogue.\nA: ........................................................................\nB: Yes, I enjoy reading about ancient people.\nA: ........................................................................\nB: Well, I learn about their life-style, their myths and their realizations.\nA: ........................................................................\nB: No, books are not my only source; museums, ruins and the Internet also enrich my knowledge about history.\nA: ........................................................................\nB: The main thing that fascinates me is the success they realized despite the hardships they met.',
      'A1) Do you enjoy reading about ancient people?\nA2) What do you learn in particular? / What is important in reading about them, then?\nA3) Are books your source of knowledge about history?\nA4) What makes you fascinated by reading about ancient people?',
      '0.5 pt for the first rejoinder; 0.25 pt for each following rejoinder',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q6`,
      `${prefix}_exploration`,
      6,
      'Question 6',
      1.5,
      'Classify the following words according to the pronunciation of their final “ed”.\nachieved - developed - constructed - succeeded - transformed - helped',
      [
        ['/t/', '/d/', '/id/'],
        ['developed\nhelped', 'achieved\ntransformed', 'constructed\nsucceeded'],
      ],
      '0.25 x 6',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 6, [
    'Either Topic 1:\nExpand the following notes to write a composition of about 150 words on the contributions of the Greeks in the universal civilization.\n- mathematics, philosophy, democracy promotion\n- scientific research, rational thinking, etc\n- peace, harmony among tribes',
    'Or Topic 2:\nWrite a composition of about 150 words explaining and illustrating how the ancient civilizations have helped humanity in its present life.',
  ], 'Topic 1: form = 3.5 pts; content = 2.5 pts.\nTopic 2: form = 3 pts; content = 3 pts.');
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2010LeSujet2(): ReviewedVariant {
  const prefix = 'le2010_s2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (14 points)', 14));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 points)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the activities.',
      'Parents in Queensland, Australia, have rejected the governmental suggestion that the school day be extended by two hours. They either disagree or strongly disagree with this suggestion considered to be made by a panel of federal education bureaucrats.',
      'Parents want no change to the present school finishing time of 3 pm, especially for students in rural and remote areas. More than 80 per cent of a survey’s respondents said that the school finishing time in these areas should remain the same, even if a longer day were introduced for students in metropolitan areas. Under the plan, the school day would be extended from 3 pm to 5 pm, with the extra hours at school providing supervised care for primary children and supervised study for high school students.',
      'A slim majority of the informants, however, do support the idea of a one-hour teacher supervised period for homework completion starting after the normal schooling end of 3 pm. They argue that their school children spend too much time doing homework alone, that they do it in their bedrooms and that it has become stressful and counter-productive.',
      'Most parents in Queensland, then, oppose the proposal and think their children would not like the two-hour idea either. They believe that even if the school day were lengthened, they would be happy to have their children supervised during those two hours by ancillary staff rather than teachers. Parents and Citizens Association president Garry Cislowski said he was not surprised by parent opposition to a longer school day. “Using teachers as baby-sitters is a pretty expensive exercise,” he said. “There are much better ways to deal with the need for outside-school-hour care. The Federal Government should stop mucking about and fund it.”',
      'Adapted from The Sunday Mail.',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      0.5,
      'Choose the general idea of the text.\na) Students’ demonstration in Queensland\nb) Queensland parents’ refusal of a longer school day\nc) Kinds of homework for Queensland students',
      'b) Queensland parents’ refusal of a longer school day',
      '0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1.5,
      'Say whether the following statements are True or False according to the text.\na) The Federal Government suggest to lengthen the school day by three extra hours.\nb) The extra hours would be devoted to supervised care and study.\nc) Gary Cislowski is for the idea of using teachers as baby-sitters.',
      'a) F    b) T    c) F',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      0.25,
      'In which paragraph is it mentioned that homework can be harmful for students?',
      '§3',
      '0.25 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      0.75,
      'What or who do the underlined words refer to in the text?\na) these (§2)    b) they (§3)    c) their (§4)',
      'a) rural and remote areas\nb) a slim majority of the informants\nc) most parents',
      '0.25 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      3,
      'Answer the following questions according to the text.\na) Give two reasons why the Federal Government suggestion has been rejected by Queensland parents.\nb) Why are some parents in favour of an extension of one hour?\nc) What is the idea in the Parents and Citizens Association about the proposal?',
      'a) Because it was made by a panel of federal education bureaucrats / because it does not suit rural and remote areas.\nb) Because they think it can be devoted to supervised homework, rather than the stressful homework done alone by students at home.\nc) They reject it and do not want teachers to become baby-sitters; they think other people can meet the need of outside-school care in other places than schools.',
      '1 x 3',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_comp_q6`,
      `${prefix}_comp`,
      7,
      'Question 6',
      1,
      'Complete the following table with information from the text.',
      [
        ['Percentage', 'Place', 'Organisations'],
        ['More than 80 per cent', 'Queensland - Australia', 'The Federal Government\nParents and Citizens Association'],
      ],
      '1 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 points)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words or phrases opposite in meaning to the following:\na) urban (§2)    b) relaxing (§3)    c) acceptance (§4)',
      'a) rural\nb) stressful\nc) opposition',
      '0.5 x 3',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Complete the following chart as shown in the example.',
      [
        ['Verb', 'Noun', 'Adjective'],
        ['to reject', 'rejection', 'rejected'],
        ['to extend', 'extension', 'extended'],
        ['to respond', 'respondent', 'responsive'],
        ['to change', 'change', 'changing'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1.5,
      'Complete sentence (b) so that it means the same as sentence (a).\n1.a) The suggestion was considered to be made by a panel of bureaucrats.\n1.b) Parents ..............................................................\n2.a) “Using teachers as baby-sitters is a pretty expensive exercise,” he said.\n2.b) He said ..............................................................\n3.a) Queensland parents could abolish the governmental proposal.\n3.b) Queensland parents ...................................................',
      '1.b) Parents considered that a panel of bureaucrats made the suggestion.\n2.b) He said that using teachers as baby-sitters was a pretty expensive exercise.\n3.b) Queensland parents were able to abolish the governmental proposal. / Queensland parents were capable of abolishing the governmental proposal. / Queensland parents managed to abolish the governmental proposal.',
      '0.5 x 3',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1,
      'Classify the following words according to the number of their syllables.\ndisagree - remote - proposal - care - governmental - idea',
      [
        ['1 syllable', '2 syllables', '3 syllables', '4 syllables'],
        ['care', 'remote\nidea', 'disagree\nproposal', 'governmental'],
      ],
      '1 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1.5,
      'Reorder the following sentences to make a coherent paragraph.\na) Their behaviour depends mainly on their parents’.\nb) We have to keep reminding ourselves\nc) are their parents.\nd) that the people most responsible for children',
      'b - d - c - a',
      '1.5 pts',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 6, [
    'Either Topic 1:\nExpand the following notes to write a composition of about 150 words.\nParents’ associations role in education\n- pedagogical role: help teachers\n- provide funds: restoring, financing projects ...\n- help solve different problems\n- negotiate decisions, take part in them\n- hold meetings, evaluate work',
    'Or Topic 2:\nSome people think that too much homework is harmful and counter-productive for students. Do you agree on such an opinion? Write a composition of about 150 words stating your arguments.',
  ], 'Topic 1: form = 3.5 pts; content = 2.5 pts.\nTopic 2: form = 3 pts; content = 3 pts.');
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function build2009LpSujet1(): ReviewedVariant {
  const prefix = 'lp2009_s1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (15 points)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 points)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the activities.',
      'Bribery, a form of pecuniary corruption, constitutes a crime and is defined as the offering, receiving, or soliciting of any item of value to influence the actions of an official or other person in discharge of a public or legal duty. The bribe is the gift bestowed to influence the recipient’s conduct. It may be any money, good, right in action, property, privilege, advantage, or merely a promise or undertaking to induce or influence the action, vote, or influence of a person in an official public capacity.',
      'The offence may be divided into two great classes: the one, where a person invested with power is induced by payment to use it unjustly; the other, where power is obtained by purchasing the suffrages of those who can impart it. Likewise, the briber might hold a powerful role and control the transaction; or in other cases, a bribe may be effectively extracted from the person paying it, although this is better known as extortion.',
      'The forms that bribery takes are numerous. For example, a motorist might bribe a police officer not to issue a ticket for speeding, a citizen seeking paperwork or utility line connections might bribe a functionary for faster service. Bribery may also take the form of a secret commission, a profit made by an agent, in the course of his employment, without the knowledge of his principal. Bribers and recipients of bribery are likewise numerous although bribers have one common denominator and that is the financial ability to bribe.',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      1.5,
      'Say whether the following statements are True or False according to the text.\na) Bribery is giving a valuable item to influence the recipient conduct.\nb) Bribery is a lawful activity.\nc) Bribery can take different forms.',
      'a) T    b) F    c) T',
      '0.5 x 3',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1.5,
      'Complete the following table with information from paragraph three.',
      [
        ['Who uses bribery?', 'Who receives the bribe?', 'Why do they use bribery?'],
        ['A motorist', 'A police officer', 'Not to issue a ticket for speeding'],
        ['A citizen', 'A functionary', 'For faster service'],
      ],
      '1.5 pts',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      1.5,
      'What or who do the underlined words refer to in the text?\na) It (§1)    b) the one (§2)    c) his (§3)',
      'a) the bribe\nb) class\nc) an agent',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1.5,
      'Answer the following questions according to the text.\na) What are the effects of bribery?\nb) What is meant by extortion?\nc) What characterizes bribers?',
      'a) It influences the action, vote or influence of a person in an official public capacity.\nb) Extortion is a bribe effectively extracted from the person paying it.\nc) The financial ability to bribe.',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      1,
      'What type is the text?\na) narrative    b) expository    c) prescriptive',
      'b) expository',
      '1 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (08 points)', 8));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words or phrases closest in meaning to the following:\na) effect (§1)    b) unfairly (§2)    c) looking for (§3)',
      'a) influence\nb) unjustly\nc) seeking',
      '0.5 x 3',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Complete the following chart as shown in the example.',
      [
        ['Verb', 'Noun', 'Adjective'],
        ['to corrupt', 'corruption', 'corrupt'],
        ['to act / to activate', 'action', 'active / acting'],
        ['to influence', 'influence', 'influential'],
        ['to finance', 'finance', 'financial'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1.5,
      'Combine the following pairs of sentences using the given connectors. Make any necessary changes.\na) The system of law is well implemented. Companies avoid bribery actions. (so...that)\nb) Specialists consultancies will help multinational companies. Multinational companies trade more ethically. (provided that)',
      'a) The system of law is so well implemented that companies avoid bribery actions.\nb) Specialists consultancies will help multinational companies provided that they trade more ethically.',
      '0.75 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      2.5,
      'Fill in each gap with one word from the list.\ncontract - exchange - services - offering - business\nEmployees, managers, or salespeople of a ........ may offer money or gifts to a potential client in ........ of favour. For instance, a food service company was recently accused of ........ gifts to an assistant warden of a local prison in exchange of a ........ allowing the company to provide the food ........ in the state’s prisons.',
      'business - exchange - offering - contract - services',
      '0.5 x 5',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1,
      'Underline the stressed syllables in the following words.\ncorruption - public - capacity - extortion',
      'corRUPtion - PUBlic - caPAcity - exTORtion',
      '0.25 x 4',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 5, [
    'Either Topic 1:\nAccording to you, how can we fight bribery? Use the following notes to write a composition of about 100 words.\n- setting well implemented system of law\n- punishing any offence (bribery activities)\n- making companies sign commitment contracts\n- inspecting the work of public officials/agents',
    'Or Topic 2:\nYou were a victim of a corrupt agent or civil servant. Write a composition of about 100 words in which you speak about the circumstances of that situation and how you reacted.',
  ], 'Topic 1: form = 3 pts; content = 2 pts.\nTopic 2: form = 2.5 pts; content = 2.5 pts.');
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2009LpSujet2(): ReviewedVariant {
  const prefix = 'lp2009_s2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (15 points)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 points)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the activities.',
      'The term Aztec refers to the empire of the Mexicas. In Nahuatl, the native language of the Mexicas, it means “someone who comes from Aztlan”, a place commonly believed to be situated in northern Mexico or the southwest U.S. It is applied to all the people linked by trade, custom, religion and language.',
      'The society traditionally was divided into two social classes: the Macehualli (people) or peasantry and the Pilli or nobility. In the later days of the empire, the concept of Macehualli had changed: only 20% of the population were dedicated to agriculture and food production. The other 80% of society were not only warriors, but also skilled artisans and aggressive traders. Eventually, most of the Macehuallis were dedicated to arts and crafts. Their works were an important source of income for the city.',
      'The Mexica, one of the Aztec groups, were one of the first people in the world to have mandatory education for nearly all children. There were two types of schools: the telpochcalli, for practical and military studies, and the calmecac, for advanced learning in writing, astronomy, statesmanship, and theology. Until the age of 14, the education of children was in the hands of their parents, but supervised by the authorities. Periodically they attended their local temples to test their progress.',
      'Adapted from Wikipedia, the free encyclopedia.',
      '* Compulsory/obligatory',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      1,
      'The passage is taken from:\na) a newspaper    b) the Internet    c) a book',
      'b) the Internet',
      'The visible source line says “Adapted from Wikipedia, the free encyclopedia.”',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1.5,
      'What or who do the underlined words refer to in the text?\na) it (§1)    b) they (§3)',
      'a) The term Aztec\nb) children',
      'a) 0.75 pt    b) 0.75 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      2.5,
      'Answer the following questions according to the text.\na) What were the common things that related the Aztecs?\nb) The Aztec society comprised two classes. What were they?\nc) Was the Aztec education reserved to one particular group? Justify from the text.',
      'a) The common things that related the Aztecs were trade, custom, religion and language.\nb) The Macehualli or peasantry and the Pilli or nobility.\nc) No, it was not. The Mexica, one of the Aztec groups, were one of the first people in the world to have mandatory education for nearly all children.',
      'a) 1 pt    b) 1 pt    c) 0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      2,
      'Order the following ideas according to their occurrence in the text.\na) Social classes and economic activities.\nb) Location of the empire.\nc) Schooling of the Aztec children.\nd) The financial importance of craftwork.',
      'b - a - d - c',
      '0.5 x 4',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (08 points)', 8));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words or phrases closest in meaning to the following:\na) connected (§1)    b) qualified (§2)    c) advance (§3)',
      'a) linked\nb) skilled\nc) progress',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Ask the questions that the underlined words answer.\na) The term Aztec refers to the empire of the Mexicas.\nb) There were two types of schools.',
      'a) What does the term Aztec refer to?\nb) How many types of schools were there?',
      '0.75 x 2',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1.5,
      'Complete the following chart as shown in the example.',
      [
        ['Verb', 'Noun', 'Adjective'],
        ['to produce', 'production', 'productive'],
        ['to practise', 'practice / practicality / practitioner', 'practical'],
        ['to educate', 'education', 'educated / educational / educative'],
        ['to believe', 'belief / believer', 'believable'],
      ],
      '0.25 x 6',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      2,
      'Fill in each gap with one word from the list.\nGod - famous - would - of\nBy AD 1500, the leading groups of people in central Mexico were the Aztecs. They were ______ for their ferocity and warfare was extremely so important for them. The blood ______ the captured prisoners was a gift offered to their ______. This, they believed, ______ bring them god’s satisfaction.',
      'famous - of - God - would',
      '0.5 x 4',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1.5,
      'Classify the following words according to the pronunciation of their final “ed”.\nbelieved - situated - linked - applied - divided - advanced',
      [
        ['/t/', '/d/', '/id/'],
        ['linked\nadvanced', 'believed\napplied', 'situated\ndivided'],
      ],
      '0.25 x 6',
    ),
  );
  addWrittenExpressionTextRubric(nodes, prefix, `${prefix}_reading`, 3, 5, [
    'Either Topic 1:\nSome people think that the Islamic civilization brought little if not nothing to humanity. Using the following notes, write a composition of about 100 words convincing these people that this idea is not true.\nThe Islamic civilization brought many benefits to mankind.\n- bring back dignity to mankind\n- establish principles of equality / democracy\n- formulate theories / write referential medical books\n- establish the ideal way of governing',
    'Or Topic 2:\nDo you think that the study of ancient civilizations is so important? Justify.',
  ], 'Topic 1: form = 3 pts; content = 2 pts.\nTopic 2: form = 2.5 pts; content = 2.5 pts.');
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function build2017SharedMakeupSujet1(): ReviewedVariant {
  const prefix = 'shared2017m_s1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (15 points)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (08 pts)', 8));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully and do the activities.',
      '“Why should we spend money on space exploration when we have so many problems here on planet Earth?” I’m asked all the time. Many NASA engineers give their expertise to apply space program technology to problems facing the developing world.',
      'A solar powered refrigerator designed to support life on the Moon earned NASA Commercial Invention for the year 2011. With approximately 2 billion inhabitants lacking access to electricity, this technology developed at NASA’s Johnson Space Center will help us explore space as well as significantly improve the lives of so many on Earth. It can be an incredible asset in places people don’t have refrigeration. Electricity is essential for storage of vaccines and medicines. This technology can greatly reduce the cost and increase the availability of vaccines delivered to the most impoverished regions of the world. The solar powered refrigerator has been approved by the WHO* as it provides cooling for vaccines in developing countries.',
      'Adapted from ‘Why Give a Damn’ by Ron Garan',
      'WHO*: World Health Organization',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2,
      'Are the following statements true or false? Write T or F next to the letter corresponding to the statement.\na. Some people think that it is worth spending money on Earth’s problems.\nb. The invention of the solar powered refrigerator was rewarded.\nc. Nearly two billion people benefit from electricity.\nd. The solar powered refrigerator is used for space research only.',
      'a) T    b) T    c) F    d) F',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      3.5,
      'Answer the following questions according to the text.\na. How do NASA engineers help solving problems facing the developing world?\nb. What are the benefits of the solar powered refrigerator on Earth?\nc. Is the writer for or against space exploration? Justify your answer from the text.',
      'a) Many NASA engineers give their expertise by applying space exploration technology to developing countries’ problems.\nb) It provides refrigeration in places where there is not any; it reduces the cost of vaccines and makes them available. At least two concrete benefits are accepted.\nc) He is for space exploration. Justification: solar powered refrigeration / give expertise / any relevant evidence from the text.',
      'a) 1 pt    b) 1 pt    c) 1.5 pts',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      1.5,
      'Who or what do the underlined words refer to in the text?\na. I (§1)    b. their (§1)    c. it (§2)',
      'a) the writer / the author / Ron Garan\nb) NASA engineers\nc) the solar powered refrigerator',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1,
      'The text is...\na. narrative    b. descriptive    c. argumentative',
      'c) argumentative',
      '1 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 pts)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words or phrases that are closest in meaning to the following:\na. confronting (§1)    b. ameliorate (§2)    c. necessary (§2)',
      'a) facing\nb) improve\nc) essential',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Give the opposites of the following words keeping the same root:\na. approve    b. apply    c. availability',
      'a) disapprove\nb) misapply\nc) unavailability',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      2,
      'Rewrite sentence “B” so that it means the same as sentence “A”.\n1.A. “Why must we spend money on space exploration?” he asked.\nB. He asked ...............................................................\n2.A. Satellites improve the accuracy of weather forecast.\nB. The accuracy of weather forecast ........................................',
      '1.B. He asked why we had to spend money on space exploration.\n2.B. The accuracy of weather forecast is improved by satellites.',
      '1 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      2,
      'Re-order the following sentences to get a coherent passage.\na. it is also leading to countless improvements for life on Earth.\nb. It is therefore a two-way technology transfer.\nc. Research on this orbiting laboratory is not only enabling humans to explore the solar system,\nd. The International Space Station provides a unique environment for scientific discovery.',
      '1-d    2-c    3-a    4-b',
      '0.5 for the topic sentence; 0.5 for each correct link',
    ),
  );
  addWrittenExpression(nodes, prefix, `${prefix}_reading`, 3, [
    'Topic One:\nThe astronomy club of your school organizes an open-day on space exploration. You are asked to deliver a speech of about 70-80 words to the visitors on the benefits of satellite uses in people’s everyday life.\nThe following notes may help you:\n- Facilitate / TV and radio programmes / broadcasting\n- Shorten distances / save time\n- Ensure communication / The Internet / phone\n- Provide / remote population/access to education / medical expertise\n- Provide data / weather forecast / climate change / natural catastrophes\n- Enable people / determine locations (GPS)',
    'Topic Two:\nYour friend wants to buy a genuine electronic device (smartphone, laptop, tablet...). But it is too expensive. So, he is thinking of purchasing a fake one.\nWrite an e-mail of about 70-80 words in which you advise him to avoid buying a fake product stating your reasons.',
  ], 'Sc.Exp, M, T.M, G.E');
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2017SharedMakeupSujet2(): ReviewedVariant {
  const prefix = 'shared2017m_s2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (15 points)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (08 pts)', 8));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully and do the activities.',
      'Bullying is when someone keeps saying or doing things to have power over you. This includes calling you stupid names, saying nasty things about you, leaving you out of activities, not talking to you, threatening, making you feel uncomfortable or scared, taking or damaging your things, hitting or kicking you, or even making you do things you don’t want to do. Moreover, you can also be bullied by someone’s lack of attention or reaction.',
      'It is estimated that about 20% of all students are bullied in school at any time, and about half have experienced bullying at some points before. Bullied students can feel unhappy, afraid, uncomfortable, depressed, hurt and alone. Therefore, many of them begin to perform poorly in academic work. Some end up dropping out of school. They may suffer depression and anxiety. They suffer eating and sleep disorders and lose interest in activities they used to enjoy.',
      'Adapted from: http://eschooltoday.com',
      'Nii Noi Odonkor',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      1,
      'On your answer sheet, copy the letter which best completes the statement.\nThe text is a:    a. magazine article.    b. website article.    c. newspaper article.',
      'b) website article',
      '1 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      2,
      'Re-order the following ideas according to their occurrence in the text.\na. Lack of attention is considered a form of bullying.\nb. We can bully a person using words.\nc. Some psychological problems are related to bullying.\nd. Children are victims of bullying at school.',
      '1-b    2-a    3-d    4-c',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      3.5,
      'Answer the following questions according to the text.\na. Why do people bully one another?\nb. How does a bullied person feel?\nc. Does bullying affect school results? Explain.',
      'a) To have power over one another.\nb) A bullied person feels unhappy, afraid, uncomfortable, depressed, hurt and alone.\nc) Yes, it affects school results. Students perform poorly in academic work and end up dropping out of school.',
      'a) 1 pt    b) 1.5 pts    c) 1 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1.5,
      'Who or what do the underlined words refer to in the text?\na. This (§1)    b. many of them (§2)',
      'a) bullying\nb) bullied students',
      '0.75 x 2',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 pts)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words whose definitions follow:\na. afraid that something bad might happen (§1)\nb. to undergo an emotional sensation (§2)\nc. a state of worry and nervousness accompanied by panic (§2)',
      'a) scared\nb) feel\nc) anxiety',
      '0.5 x 3',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Divide the following words into roots and affixes.\ndisorders - reaction - damaging',
      [
        ['Prefix', 'Root', 'Suffix'],
        ['dis', 'order', 's'],
        ['re', 'act', 'ion'],
        ['////', 'damage', 'ing'],
      ],
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      2,
      'Combine each pair of sentences with the connectors given in brackets. Make any necessary changes.\na. Bullied students feel very depressed. Bullied students end up dropping out of school. (so...that)\nb. Bullying is physical violence. Bullying is verbal violence. (both...and)',
      'a) Bullied students feel so depressed that they end up dropping out of school.\nb) Bullying is both physical and verbal violence.',
      '1 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      2,
      'Complete what “B” says to “A”.\nA: Mom, my classmate makes fun of me in front of the others.\nB: ................................................?\nA: She says I’m “chicken” and tries to hit me.\nB: ................................................?\nA: Unfortunately, I tried to speak to her but it was useless!\nB: ................................................?\nA: No, she’s a bad student...too bad.\nB: Oh I see, my dear! But you should try again.',
      'B: Really? What does she say?\nB: Did you speak to her?\nB: Is she a good student?',
      'Accept other possible answers: 1 pt, 0.5 pt, 0.5 pt',
    ),
  );
  addWrittenExpression(nodes, prefix, `${prefix}_reading`, 3, [
    'Topic One:\nUsing the following notes, write a composition of about 70 to 80 words.\nYou discovered that a hacker has been using your facebook account to post harmful photos and comments. How did you feel? And what did you do?\nThe notes:\n- shocked / depressed / anxious / lost\n- contact / police / complain\n- meet / computing specialist\n- inform / contacts / problem\n- install / software / protect / account',
    'Topic Two:\nWrite a composition of about 70 to 80 words on the following topic.\nA new factory is being built in your area. You believe that this would endanger environment including people, animals and plants. As a newspaper journalist, you decide to write an article to denounce this project. (sign the article as Mohammed Taleb)',
  ], 'Sc.Exp, M, T.M, G.E');
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function build2017LpMakeupSujet1(): ReviewedVariant {
  const prefix = 'lp2017m_s1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'PART ONE: READING (15 points)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A/ Comprehension (07 pts)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the following activities.',
      'Children doing paid work is a complex issue on which opinions disagree whether it is “wrong” or “valuable” and also on its “learning benefits”.',
      'Contrary to working in industry which is unsafe and unhealthy, children working at home would learn more. Unfortunately, employers prefer using children’s services in order to save money by paying them lower wages. This exploitation should be banned.',
      'However, in many countries children work to help their needy families. This was certainly the case in the past in many industrialized countries. It is, in fact, very difficult to judge that it is wrong for children today to contribute to family income in this way.',
      'Nevertheless, in better economic circumstances, few parents would send their children to work. Thus, children can acquire learning responsibilities and work experience by having light part-time jobs or helping their parents at home. Such unpaid tasks are valuable in children’s development.',
      'Adapted from: “CAMBRIDGE IELTS 3”, Cambridge University Press, 2002.',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2,
      'Are the following statements true or false? Write T or F next to the letter corresponding to the statement and correct the false one(s).\na) Working in factories is risky.\nb) Employers pay children fairly.\nc) Many children are compelled to work because of deprivation.\nd) Industrialized countries were confronted with child labour problem.',
      'a) T\nb) F. Employers pay children lower wages.\nc) T\nd) T',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1,
      'In which paragraph is it mentioned that...\na) there is a dilemma between condemning child labour and favouring it?\nb) the writer advocates forbidding child labour?',
      'a) §1 / the 1st paragraph\nb) §2 / the 2nd paragraph',
      '0.5 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      3,
      'Answer the following questions according to the text.\na) What do employers use children’s services for?\nb) How can unpaid work be beneficial to children’s development?\nc) Do you encourage child labour? Justify.',
      'a) For saving money by paying them lower wages / in order to save money.\nb) By acquiring learning responsibilities and work experience.\nc) Yes: it must be a part-time job / financial autonomy / acquiring responsibility and experience. No: exploitation / low wages / no education. Accept any other logical answer.',
      '1 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1,
      'Who or what do the underlined words refer to in the text?\na) which (§2)    b) their (§3)',
      'a) working in industry\nb) children',
      '0.5 x 2',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B/ Text Exploration (08 pts)', 8));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      2,
      'Find in the text words or phrases that are closest in meaning to the following:\na) forbidden (§2)    b) poor (§3)    c) obtain (§4)    d) growth (§4)',
      'a) banned\nb) needy\nc) acquire\nd) development',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      2,
      'Ask questions which the underlined words answer.\na) Children work in factories to help their needy families.\nb) Children can acquire learning responsibilities and work experience.',
      'a) Why do children work in factories?\nb) What can children acquire?',
      '1 x 2',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      1,
      'Classify the following words according to the stressed syllable.\na) children    b) economic    c) industrialize    d) exploitation',
      [
        ['1st syllable', '2nd syllable', '3rd syllable'],
        ['children', 'industrialize', 'economic\nexploitation'],
      ],
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      3,
      'Imagine what A says, and complete the following dialogue.\nA: ........................................................................?\nB: No, I didn’t see that report on child labour. I was washing my father’s car. Was it interesting?\nA: .........................................................................\nB: Oh my God! That’s terrible. Are they obliged to accept such miserable conditions?\nA: .........................................................................\nB: You are right. It’s high time government and society acted to protect children’s rights.',
      'A1: Did you see the report on child labour yesterday?\nA2: It was rather shocking. Children are exploited, underpaid and exposed to risks. Any logical answer related to children’s bad working and living conditions.\nA3: They have no choice. I think that all of us, with the help of the government, must work to protect children’s rights.',
      '1 x 3',
    ),
  );
  addWrittenExpression(nodes, prefix, `${prefix}_reading`, 3, [
    'Topic One:\nYour best friend dropped out of school and started working in an agricultural field. Months later you met him and he started talking about his harsh living and working conditions. Using the following notes write a composition of about 70 to 80 words to your school magazine reporting the sufferings of your friend.\n- malnutrition\n- no health care\n- deprived of education\n- ill-treatment of the employer\n- work for a living\n- robbed of their childhood.',
    'Topic Two:\nMore and more adolescents are getting addicted to drugs for different reasons. Write an article of about 70 to 80 words to an electronic newspaper in which you describe how this social evil dramatically affects family, school and society.',
  ], 'L&PH');
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2017LpMakeupSujet2(): ReviewedVariant {
  const prefix = 'lp2017m_s2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'PART ONE: READING (15 points)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A/ Comprehension (07 pts)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the activities.',
      'The Sahara Desert was an extremely important geographical feature in the history of the great medieval African empires. Today the Sahara is the largest desert in the world. But it was not always so.',
      'Rock paintings found in the mountains of the Sahara reveal that until about 5000 B.C., the region was a land of rivers and lakes. It was populated by hunters and fishermen, grassland animals such as rhinoceros, elephants, and giraffes, and water creatures including hippopotami, crocodiles, and fish.',
      'By around 3000 B.C., the region had begun to dry out. Rock paintings from this period show that the big animals were gone. They had moved north and south to wetter climate zones. Many of the humans also moved northward into the Maghrib, which is the Arabic word for northwestern Africa. Eventually, the dry region became known as the Sahara, which is the Arabic word for “desert”.',
      'Although it became more and more difficult to survive in the Sahara, many people stayed there. Some of them settled in oases—areas in the desert with springs and wells that enabled them to grow date palms and vegetable gardens.',
      'Adapted from “Great Empires of the Past” by David C. Conrads. p.7 (2010)',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2,
      'Are these statements true or false? Write T or F next to the letter corresponding to the statement.\na) The Sahara has always been a desert.\nb) Rock paintings are witnesses of climate change in the region.\nc) The Sahara was never inhabited by people.\nd) Some people stayed in the Sahara despite the hard living conditions.',
      'a) False    b) True    c) False    d) True',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1.5,
      'In which paragraph is it mentioned that...\na) Fishing and hunting existed in the Sahara years ago?\nb) Some people moved to North Africa because of dryness?\nc) People who stayed in the region settled around water sources?',
      'a) §2    b) §3    c) §4',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      2.5,
      'Answer the following questions according to the text.\na) Did climate change have an impact on life in the Sahara desert? Justify from the text.\nb) What helped the settlers continue to live in the Sahara?',
      'a) Yes, it did. Big animals were gone. Humans moved.\nb) Springs and wells helped them grow date palms and vegetable gardens.',
      'a) 1.5 pts    b) 1 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1,
      'Who or what do the underlined words refer to in the text?\na) so (§1)    b) this period (§3)    c) there (§4)',
      'a) the largest desert in the world\nb) by around 3000 B.C.\nc) Sahara',
      '0.25 x 4',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B/ Text Exploration (08 pts)', 8));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      2,
      'Find in the text words, phrases or expressions whose definitions follow:\na) relating to the Middle Ages (§1)\nb) pictures put on the surface of objects, walls etc. (§2)\nc) without water (§3)\nd) deep holes in the ground from which water can be obtained (§4)',
      'a) medieval\nb) paintings\nc) dry\nd) wells',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1,
      'Give the opposites of the following words keeping the same root.\npopulated - known - fertile - integration',
      'populated ≠ depopulated\nknown ≠ unknown\nfertile ≠ infertile\nintegration ≠ disintegration',
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      3,
      'Complete sentence (b) so that it means the same as sentence (a):\n1) a. The Sahara became dry due to reduced precipitation and higher temperature.\n   b. Owing to .............................................................\n2) a. Archeologists claimed, “People lived on the edge of the desert thousands of years ago.”\n   b. Archeologists claimed ................................................',
      '1) Owing to reduced precipitation and higher temperature, the Sahara became dry.\n2) Archaeologists claimed that people had lived on the edge of the desert thousands of years before.',
      '1.5 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      2,
      'Fill in the gaps with only FOUR words from the list.\nwent - ancestors - including - settled - created - language\nThe people of Phoenicia, who flourished from 1200 – 800 B.C., ...(1)... a confederation of kingdoms across the entire Sahara to Egypt. They generally ...(2)... along the Mediterranean coast, as well as the Sahara, among the people of Ancient Libya, who were the ...(3)... of people who speak Berber Languages in North Africa and Sahara today, ...(4)... the Tuareg of the central Sahara.',
      '1) created    2) settled    3) ancestors    4) including',
      '0.5 x 4',
    ),
  );
  addWrittenExpression(nodes, prefix, `${prefix}_reading`, 3, [
    'Topic One:\nWhile studying about ancient civilizations, your school organized a trip to an archeological site in your region. Write an article of about 70 to 80 words for your school magazine in which you describe the site.\nYou can use the following notes:\n- name / location of the site\n- description of the site\n- historical value (civilization/period)\n- state of preservation',
    'Topic Two:\nA friend of yours faces disciplinary measures because of his/her misbehaviour. Write a letter to the headmaster asking him for a psychological help to your friend as you know that he/she suffers from violence at home. (Sign the letter Rabeh Ben Rabeh).',
  ], 'L.PH');
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function build2017LeMakeupSujet1(): ReviewedVariant {
  const prefix = 'le2017m_s1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'PART ONE: READING (14 points)', 14));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 pts)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the following activities.',
      'The education system in Finland has received plenty of attention from all over the world. Finnish 15-year olds are number one in terms of skills in mathematics, scientific knowledge, reading literature and problem solving. Such exceptional performance stems from long-term education policy that has been based on the need to enhance equity and quality of education. This means that the aim has been to arrange high-level education for all.',
      'Finland has built up an education system based on uniformity, free education, free school meals and special needs education by using the principle of inclusion. Finnish basic education has been logically developed towards the comprehensive model which guarantees everybody equal opportunities in education irrespective of sex, social status, ethnic group etc. as outlined in the constitution. The focus has been on equity.',
      'Implementation of the new basic education system was carried out in stages between 1972 and 1975, starting in the northern part of Finland and finishing in the southern part of the country. It was the end of the parallel education system that labeled students as being “talented” or “untalented” after only four or five years at elementary school. That meant an increase in educational optimism.',
      'Adapted from: “Finnish Strategy of High-Level Education For All” R Laukkanen, University of Lausanne, 2006.',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2.5,
      'Are the following statements true or false? Write T or F next to the letter corresponding to the statement and correct the false one(s).\na) The world has shown interest in the Finnish education system.\nb) Young Finnish students are ranked last in different subjects.\nc) It took a decade to implement the new basic education system.\nd) The Finnish education system can identify good learners at an early age.',
      'a) T\nb) F. They are number one.\nc) F. It took three years / between 1972 and 1975.\nd) T',
      '2.5 pts',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1,
      'In which paragraph is it mentioned that...\na) the impressive results achieved by the Finnish educational system have required years of work?\nb) the emphasis is laid on equality and fairness?',
      'a) §1    b) §2',
      '0.5 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      2.25,
      'Answer the following questions according to the text.\na) In which field did Finnish students achieve exceptional performance?\nb) Do Finnish students pay for their education? Justify.\nc) In your opinion, what is the most important in a school reform, equity or quality? Justify.',
      'a) Mathematics, scientific knowledge, reading literature and problem solving.\nb) No, they don’t. Education is free.\nc) Both. Equity means no discrimination according to sex, ethnic or social groups. Quality means good education with high standards. Accept any logical answer.',
      '0.75 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      0.75,
      'Who or what do the underlined words refer to in the text?\na) that (§1)    b) which (§2)    c) that (§3)',
      'a) long-term education policy\nb) comprehensive model\nc) the parallel education system',
      '0.25 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      0.5,
      'Give a title to the text.',
      'Education in Finland',
      '0.5 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 pts)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words or phrases that are closest in meaning to the following:\na) extraordinary (§1)    b) ensures (§2)    c) primary (§3)',
      'a) exceptional\nb) guarantees\nc) elementary / basic',
      '0.5 x 3',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Divide the following words into their roots and affixes.\nirrespective - untalented - comprehensive',
      [
        ['prefix', 'root', 'suffix'],
        ['ir', 'respect', 'ive'],
        ['un', 'talent', 'ed'],
        ['///', 'comprehend', 'ive'],
      ],
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      2,
      'Ask questions which the underlined words answer.\na) Finland exceptional performance stems from long-term education policy.\nb) The implementation of the new basic education system was carried out between 1972 and 1975.',
      'a) What does Finland exceptional performance stem from?\nb) When was the implementation of the new basic education system carried out?',
      '1 x 2',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1,
      'Classify the following words according to the stressed syllable.\na) education    b) equality    c) students    d) arrange',
      [
        ['1st syllable', '2nd syllable', '3rd syllable'],
        ['students', 'equality - arrange', 'education'],
      ],
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1,
      'Fill in the gaps with only FOUR words from the list given.\nfind - interact - explore - learn - activity - construct\nChildren are naturally curious and active. They eagerly ...(1)... their environment and ...(2)... with people, which help them to ...(3)... their understanding of the world they live in. An important way in which they do this is through physical ...(4)... and experiencing things at first hand.',
      '1) explore    2) interact    3) construct    4) activity',
      '0.25 x 4',
    ),
  );
  addWrittenExpression(nodes, prefix, `${prefix}_reading`, 3, [
    'Topic One:\nYou have been selected by the US Embassy to represent your school within a program of cultural educational exchange. Using the following notes, write a speech of about 80 to 100 words that you will deliver to American students on how to improve your school performance.\n- reduce class size\n- take part in recreational activities\n- work together with teachers to set motivation\n- involve parents, etc.',
    'Topic Two:\nLarge numbers of children work in extremely exploitative conditions. Write an article of about 80 to 100 words to be published on your facebook page, describing to your followers how these conditions affect the physical, mental and emotional state of the child.',
  ], 'LE', {
    maxPoints: 6,
    row: ['LE', '1.5', '1', '2', '1.5', '6'],
  });
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2017LeMakeupSujet2(): ReviewedVariant {
  const prefix = 'le2017m_s2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (14 points)', 14));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A) Comprehension (07 pts)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully and do the activities.',
      'Child labour is a pervasive problem throughout the world, especially in developing countries. It is especially prevalent in rural areas where the capacity to enforce minimum age requirements for schooling and work is lacking. Children work for a variety of reasons, the most important being poverty and the induced pressure upon them to escape from this plight. Though children are not well paid, they still serve as major contributors to family income. Schools’ inaccessibility, the lack of quality education and traditional factors also increase child labour.',
      'Working children are the objects of extreme exploitation. Their work conditions are extremely severe, often not providing the stimulation for proper physical and mental development. Many of these children endure lives of pure deprivation. However, there are problems with the intuitive solution of immediately abolishing child labour to prevent such abuse. First, there is no international agreement defining child labour, making it hard to isolate cases of abuse, let alone abolish them. Second, many children may have to work in order to attend school so abolishing child labour may only hinder their education. The state could help by making it worthwhile for a child to attend school, there must be an economic change in the condition of a struggling family to free a child from the responsibility of working.',
      'Adapted from: “Child Labour: Issues, Causes And Interventions”, 1995. By Faraaz Siddiqi & Harry Anthony Patrinos',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      0.5,
      'The text is: a) a survey    b) an article    c) an advert.',
      'b) an article',
      '0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      2,
      'Are the following statements true or false? Write T or F next to the letter corresponding to the statement and correct the false one(s).\na) Child labour is limited to developed countries only.\nb) Lack of age requirements for schooling and work makes child labour more common in rural areas.\nc) Working children’s low wages are the main source of their families’ incomes.\nd) Child labour often causes children’s lack of basic needs.',
      'a) F. Child labour is a pervasive problem throughout the world, especially in developing countries.\nb) T\nc) T\nd) T',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      3,
      'Answer the following questions according to the text.\na) Why do children have to work?\nb) What may prevent the abolishment of child labour?\nc) How could the problem of child labour be solved?',
      'a) Poverty, low families income, schools inaccessibility, lack of quality education, traditional factors, and to attend school. Full mark for four items.\nb) No international agreement defining child labour; many children have to work to pay school fees.\nc) The state could help by making it worthwhile for a child to attend school. There must be an economic change in the condition of a struggling family to free a child from the responsibility of working.',
      '1 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      0.75,
      'Who or what do the underlined words refer to in the text?\na) It (§1)    b) this plight (§1)    c) them (§2)',
      'a) child labour\nb) poverty\nc) cases of abuse / cases',
      '0.25 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q5`,
      `${prefix}_comp`,
      6,
      'Question 5',
      0.75,
      'The text is: a) expository    b) prescriptive    c) descriptive    d) narrative',
      'a) expository',
      '0.75 pt',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B) Text Exploration (07 pts)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words, phrases or expressions that are closest in meaning to the following:\na) apply (§1)    b) very (§2)    c) end (§2)',
      'a) enforce\nb) extremely\nc) abolish / abolishing',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      0.75,
      'Give the opposites of the following words keeping the same root.\npure - important - responsibility',
      'pure ≠ impure\nimportant ≠ unimportant\nresponsibility ≠ irresponsibility',
      '0.25 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      2.75,
      'Rewrite sentence “b” so that it means the same as sentence “a”.\nA. a. If minimum age requirements for schooling are enforced, children will not have to work.\n   b. Unless...............................................................\nB. a. The government should abolish child labour.\n   b. It’s high time .......................................................\nC. a. Child labour is a violation of children’s rights; therefore, strict regulations are to be implemented.\n   b. Because of ..........................................................',
      'A) Unless minimum age requirements for schooling are enforced, children will have to work.\nB) It’s high time the government abolished child labour.\nC) Because of the violation of children’s rights, strict regulations are to be implemented.',
      '2.75 pts',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      1,
      'Match pairs that rhyme.\nA: 1. abuse    2. favour    3. child    4. pure\nB: a. side    b. cure    c. accuse    d. labour',
      '1-c    2-d    3-a    4-b',
      '0.25 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q5`,
      `${prefix}_exploration`,
      5,
      'Question 5',
      1,
      'Fill in the gaps with only FOUR words from the list below:\nhelp - abuse - working - focus - required - investigation\nAn analysis has led to certain implications for the international community. Further ...(1)... into child labour issue is ...(2)... before calls are made for banning it. By establishing partnerships with humanitarian organizations, the international community can ...(3)... on immediately solving the remediable problems of ...(4)... children.',
      '1) investigation    2) required    3) focus    4) working',
      '0.25 x 4',
    ),
  );
  addWrittenExpression(nodes, prefix, `${prefix}_reading`, 3, [
    'Topic One:\nChild labour is causing concern to all governments. Write a composition of about 80 to 100 words showing how to deal with this problem.\nThe following notes may help you:\n- fight poverty\n- support poor families to educate their children\n- impose stringent regulations to ban child labour\n- sensitize families of the dangers of child labour, etc.',
    'Topic Two:\n“Children want the same things we want. To laugh, to be challenged, to be entertained, and delighted.” Write a composition of about 80 to 100 words in which you show the impact of these factors on the learning atmosphere.',
  ], 'LE', {
    maxPoints: 6,
    row: ['LE', '1.5', '1', '2', '1.5', '6'],
  });
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function build2018LpSujet1(): ReviewedVariant {
  const prefix = 'lp2018_s1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part one: Reading (15 points)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A/ Comprehension (07 pts)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the following activities.',
      'The valley of the Indus River is considered to be the birthplace of the Indus civilization. Located on the Indian subcontinent in modern Pakistan, the Indus civilization was not discovered by archaeologists until 1924. The ancient history of this region is obscured by legend. It appears, however, that by 4000 BC primitive farmers were growing vegetables, grains, and breeding animals along the riverbanks.',
      'There is some evidence that Mesopotamian traders reached the nearly Indian people by sailing from Sumer to the Indus valley. The Indians shared some developments - such as complex irrigation and drainage systems, and the art of writing - with Sumer, they also developed their own system of writing.',
      'The Indus civilization had large cities that were well laid-out and well fortified. There were public buildings, palaces, baths, and large granaries to hold agricultural produce. The many artworks found by archaeologists indicate that the residents of the Indus had reached a fairly high level of culture before their civilization was destroyed.',
      'Adapted from Britannica 2009',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2,
      'Say whether the following statements are True or False? Write T or F next to the letter corresponding to the statement and correct the false one(s).\na) The Indus civilization was known before 1924.\nb) Sailors from Mesopotamia arrived at the Indus valley.\nc) The Indus valley cities and towns were well-protected.\nd) The Indus people\'s culture was not very developed.',
      'a) F. The Indus civilization was not discovered until 1924.\nb) T\nc) T\nd) F. The Indus culture reached a fairly high level.',
      '2 pts: a) 0.75, b) 0.25, c) 0.25, d) 0.75',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1,
      'Identify the paragraphs in which the following ideas are mentioned.\na) ancient Indus people relied on agriculture.\nb) the Indus left many historical and artistic works.',
      'a) §1    b) §3',
      '0.5 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      3,
      'Answer the following questions according to the text.',
      null,
      null,
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_a`,
      `${prefix}_comp_q3`,
      1,
      'Question 3.a',
      1,
      'Where did the Indus civilization rise?',
      'The Indus civilization rose in the valley of the Indus River in modern Pakistan.',
      '1 pt',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_b`,
      `${prefix}_comp_q3`,
      2,
      'Question 3.b',
      1,
      'Which inventions did the Indians share with the Sumerians?',
      'The Indians shared some developments such as complex irrigation and drainage systems and the art of writing.',
      '1 pt',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_c`,
      `${prefix}_comp_q3`,
      3,
      'Question 3.c',
      1,
      'Mention two of the Indus civilization achievements.',
      'The Indus civilization achievements are: complex irrigation and drainage systems, the art of writing, public buildings, palaces, baths, large granaries and art works. Accept two achievements.',
      '1 pt',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1,
      'Find who or what the underlined words in the text refer to.\na) this region (§1)    b) they (§2)    c) that (§3)    d) their (§3)',
      'a) The valley of the Indus River (modern Pakistan)\nb) The Indians\nc) large cities\nd) the residents of the Indus',
      '0.25 x 4',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B/ Text Exploration (08 pts)', 8));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words or phrases that are opposite in meaning to the following.\na) modern (§1)    b) simple (§2)    c) low (§3)',
      'a) ancient / primitive\nb) complex\nc) high',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      2.5,
      'Ask questions which the underlined words answer.\na) The Indus people developed their own system of writing.\nb) The Indians built public buildings and palaces.',
      'a) What did the Indus people develop?\nb) Who built public buildings and palaces?',
      '1.25 x 2',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      2,
      'Classify the following words according to the pronunciation of the final "ed".\nconsidered - located - emerged - developed',
      [
        ['/t/', '/d/', '/id/'],
        ['developed', 'considered\nemerged', 'located'],
      ],
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      2,
      'Fill in each gap with the appropriate word from the list given:\nstarted - now - first - land\nThe earliest civilizations developed in river valleys because the land was good for farming. The world\'s .....(1)......... civilization emerged in Mesopotamia. This .....(2)......... was between Tigris and Euphrates rivers, in what is .......(3)....... Iraq. People first .......(4)........ settling there in about 4500 BC.',
      '1) first    2) land    3) now    4) started',
      '0.5 x 4',
    ),
  );
  addWrittenExpression(nodes, prefix, `${prefix}_reading`, 3, [
    'Topic one:\nIn your class, many pupils were not able to talk about the Islamic civilization. Therefore, your teacher asked you to write an article of about 80 to 100 words to inform your classmates about its achievements and contributions to humanity.\nThe following notes may help you:\n- Governing ways\n- Organized society\n- Scientific achievements\n- New irrigation and agricultural systems\n- Discoveries / essential for modern studying',
    'Topic two:\nYour little brother is a good pupil, but he does not manage to score well at exams. Every time he takes an exam, he feels nauseous and nervous. Write an article of about 80 to 100 words for your school magazine analysing the causes and the effects of examinations stress on students and giving some pieces of advice that may help your brother and other examinees.',
  ], 'LPh');
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2018LpSujet2(): ReviewedVariant {
  const prefix = 'lp2018_s2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part one: Reading (15 points)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A/ Comprehension (07 pts)', 7));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully then do the following activities.',
      'The Benefits of Fairy Tales',
      '“If you want your children to be intelligent, read them fairy tales. If you want them to be more intelligent, read them more fairy tales.” — Albert Einstein',
      'Fairy Tales are essential stories for childhood. These stories are more than just happily ever after, they portray real moral lessons through characters and virtue shown in the stories. They do not only captivate the imagination of young minds, but also enhance their creativity and reasoning skills. A child learns a lot by simply listening to these amazing stories. It also creates a special parent-child bond, when parents read stories to their children.',
      'Fairy tales may bring children to a fantasy land but as they grow, the moral truths of these stories remain in their hearts and minds. However not all parents believe in the importance of fairy tales for kids. But studies show that they bring significant positive results in the development of a young mind.',
      'Children learn from the characters in the stories and this helps them connect the situation with their own lives. The stories show children how to have a positive outlook amidst any anxieties, battles and problems in life. It also teaches them critical thinking skills.',
      'Adapted from nepeantutoring.com.au/the-benefits-of-fairy-tales/',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      0.5,
      'Identify the type of text.\nThe text is: a- a book extract    b- an article    c- a story',
      'An article',
      '0.5 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      2,
      'Say whether the following statements are True or False. Write T or F next to the letter corresponding to the statement and correct the false one(s).\na) Fairy tales are necessary especially for kids.\nb) Fairy tales develop children’s aggressiveness.\nc) Thanks to fairy tales, parents and children become distant.\nd) Fairy tales allow children to deal with issues in daily life.',
      'a) T\nb) F. Fairy tales bring significant positive results in the development of a young mind; they help children have a positive outlook amidst anxieties, battles and problems in life.\nc) F. It creates a special parent-child bond.\nd) T',
      '2 pts: a) 0.25, b) 0.75, c) 0.75, d) 0.25',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      3,
      'Answer the following questions according to the text.',
      null,
      null,
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_a`,
      `${prefix}_comp_q3`,
      1,
      'Question 3.a',
      1,
      'Why does Einstein say that fairy tales make children intelligent?',
      'They captivate the imagination of young minds and enhance their creativity and reasoning skills.',
      '1 pt',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_b`,
      `${prefix}_comp_q3`,
      2,
      'Question 3.b',
      1,
      'In what ways are fairy tales important to improve family relations?',
      'Fairy tales are important to family relationships because they create a parent-child bond when parents read stories to their children.',
      '1 pt',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_c`,
      `${prefix}_comp_q3`,
      3,
      'Question 3.c',
      1,
      'Pick from paragraph four two aspects of fairy tales.',
      'Children learn from the characters in the stories; this helps them connect the situation with their own lives; they learn how to have a positive outlook amidst anxieties, battles and problems in life; fairy tales teach them critical thinking skills. Accept two aspects.',
      '0.5 for each aspect',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1.5,
      'Find who or what the underlined words in the text refer to.\na) these stories (§2)    b) they (§3)    c) this (§4)',
      'a) fairy tales\nb) children\nc) children learn from the characters in the stories / learning from the characters in the stories',
      '0.5 x 3',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B/ Text exploration (08 pts)', 8));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words or phrases that are opposite in meaning to the following:\na) unnecessary (§2)    b) drive away (§2)    c) reality (§3)',
      'a) essential\nb) captivate\nc) fantasy',
      '0.5 x 3',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Divide the following words into roots and affixes.\ncritical - unreal - development',
      [
        ['Prefix', 'Root', 'Suffix'],
        ['/', 'critic', 'al'],
        ['un', 'real', '/'],
        ['/', 'develop', 'ment'],
      ],
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      3,
      'Rewrite sentence ‘b’ so that it means the same as sentence ‘a’.\nA- a- Fairy tales portray moral lessons.\n   b- Moral lessons ........................................................\nB- a- I regret my parents didn’t read me fairy tales.\n   b- I wish ................................................................\nC- a- Girls read fairy tales but boys watch Mangas.\n   b- Unlike ...............................................................',
      'A) Moral lessons are portrayed by fairy tales.\nB) I wish my parents had read me fairy tales.\nC) Unlike girls, who read fairy tales, boys watch Mangas. / OR Unlike boys, who watch Mangas, girls read fairy tales.',
      '1 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      2,
      'Fill in each gap with the appropriate word from the list given.\nhave - programmes - violence - aggressive\nResearchers claimed that high levels of ........(1)............ in cartoons, such as Scooby-Doo can make children more .........(2)......... They found that animated shows aimed at youngsters often ...........(3)............ more brutality than ...........(4).......... broadcast for general audiences.',
      '1) violence    2) aggressive    3) have    4) programmes',
      '0.5 x 4',
    ),
  );
  addWrittenExpression(nodes, prefix, `${prefix}_reading`, 3, [
    'Topic one:\nToday, children watch cartoons where violence prevails. You believe that these programmes have a negative impact on kids’ behaviour. As a youngster who was exposed to such programmes in your childhood, write a speech of about 80 to 100 words to sensitize your schoolmates about the menaces of such programmes.\nThe following notes may help you:\n- rise of aggressiveness\n- kill creativity\n- destroy sensitiveness and empathy\n- imitate dangerous actions\n- bad influence ...',
    'Topic Two:\nYou visited Egypt and you were fascinated by the pyramids, the oldest and best preserved of all ancient wonders, which were built about 2600 BC. Write a poster of about 80 to 100 words for your school wall journal telling about your visit and how you felt in such mysterious and gigantic structures.',
  ], 'LPh');
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function build2021SharedSujet1(): ReviewedVariant {
  const prefix = 's1';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (15 pts)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A/ Comprehension (08 pts)', 8));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully to do the activities.',
      'Research clearly shows that being overweight greatly increases your risk for many diseases including heart disease, cancer, and diabetes. If you are overweight, combining regular physical activity with a healthful eating plan is the most effective way to lose weight and to sustain the loss. If you are at a healthy weight, your goal is to maintain that weight.',
      'Whether you are young or old, you can improve your health by being more active each day. Choose activities that you enjoy and can do regularly. Although you will gain more health benefits with high intensity exercise that lasts 30 minutes or more, low-to-moderate activities can be part of your regular physical exercise. For some people, this means fitting more activity of daily living into their usual routine. This could include using the elevator less and using the stairs more, parking farther from rather than closer to your destination, gardening, or golfing without a cart. For others, a more structured programme might be preferred, such as at a worksite or a health club.',
      'In addition to physical exercise, your body needs more than 40 nutrients and other substances for good health. No one food can give you all the nutrients your body needs, no matter how much you enjoy it or how nutritious the food is. By eating a wide variety of foods each day, you will keep your meals exciting and you will achieve the balance of nutrients that best ensures good health.',
      'Adapted from Encyclopedia of Foods: A Guide to Healthy Nutrition - Part One - 2002',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      2,
      'Say whether the following statements are true or false.\na) Obesity can be responsible for many diseases.\nb) A healthy diet is enough to keep a healthy weight.\nc) Only intense physical activity is good for health.\nd) Some types of food contain all the nutrients your body needs.',
      'a) true    b) false    c) false    d) false',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      2,
      'Identify the paragraphs in which the following ideas are mentioned:\na) Daily physical activity keeps people in good health.\nb) No particular food can provide the body with all it needs.',
      'a) §2    b) §3',
      '1 x 2',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      3,
      'Answer the following questions according to the text.',
      null,
      null,
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_a`,
      `${prefix}_comp_q3`,
      1,
      'Question 3.a',
      1,
      'What two measures should obese people take to reduce their weight?',
      'a healthful eating plan and regular physical activity.',
      '1 pt',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_b`,
      `${prefix}_comp_q3`,
      2,
      'Question 3.b',
      1,
      'Which activities of daily living can help people improve their health?',
      'using the elevator less and using the stairs more, parking farther from rather than closer to your destination, gardening, or golfing without a cart.',
      '1 pt (0.25 for each item)',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_c`,
      `${prefix}_comp_q3`,
      3,
      'Question 3.c',
      1,
      'Why is it necessary for people to eat different types of food?',
      'because no food contains all the nutrients and substances the body needs, or to provide the body with all the nutrients and substances it needs, or to achieve the balance that best ensures good health.',
      '1 pt',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1,
      'Find what or who the underlined words in the text refer to.\na) that weight (§1)    b) their (§2)',
      'a) healthy weight    b) some people',
      '0.5 x 2',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B/ Text Exploration (07 pts)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words or phrases that are closest in meaning to the following:\na) obese (§1)    b) advantages (§2)    c) guarantees (§3)',
      'a) overweight    b) benefits    c) ensures',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Give the opposites of the following words keeping the same root.\nregular - active - healthy',
      'regular ≠ irregular\nactive ≠ inactive\nhealthy ≠ unhealthy',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      2,
      'Put the verbs in brackets in the right form.\nWeight control is the process of losing or avoiding excess body fat. It (to depend) on the relationship between the amount of food you eat and the energy your body (to use) to maintain itself or to exercise. This relationship (to govern) partly by heredity and other factors that people cannot control. But in general, the less you eat and the more you exercise, the less fat you (to have).',
      'depends; uses or will use; is governed; have or will have',
      '0.5 x 4',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      2,
      'Reorder the following sentences to get a coherent passage.\na) But they are so inactive that, even with a moderate appetite,\nb) Physical inactivity is a leading cause of obesity among the young.\nc) they eat more than they need and accumulate excess fat.\nd) Most of these obese young people do not eat more than young people of average weight.',
      '1-b    2-d    3-a    4-c',
      '0.5 for opening sentence and 0.5 for each correct link',
    ),
  );
  addWrittenExpression(nodes, prefix, `${prefix}_reading`, 3, [
    'Topic 1:\nStatistics released by the Department of Health show that many young people suffer from different health problems because they are physically inactive.\nWrite an article of about 80 to 120 words for your school magazine to sensitize your schoolmates about the benefits of physical exercise for health.\nMake the best use of the following notes:\n- lose weight / prevent against obesity\n- strengthen the immune system\n- reduce stress and anxiety',
    'Topic 2:\nIn some parts of the world, thousands of children are illegally employed and exploited by unscrupulous businesses.\nWrite a letter of about 80 to 120 words to the UNICEF representative in your country to denounce such an unethical practice.',
  ]);
  return {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes,
  };
}

function build2021SharedSujet2(): ReviewedVariant {
  const prefix = 's2';
  const nodes: ReviewedNode[] = [];
  nodes.push(part(`${prefix}_reading`, null, 1, 'Part One: Reading (15 pts)', 15));
  nodes.push(part(`${prefix}_comp`, `${prefix}_reading`, 1, 'A/ Comprehension (08 pts)', 8));
  nodes.push(
    context(`${prefix}_text`, `${prefix}_comp`, 1, 'Reading Text', [
      'Read the text carefully to do the activities.',
      'Ethical employees are those who make decisions in the best interest of their employers, co-workers and outside stakeholders in addition to themselves. Workplace ethics centre on such diverse issues as discrimination, fraud, theft and harassment. Although all people are intrinsically valuable, ethical employees can actually be more financially valuable to their employers, and more valued by co-workers and peers.',
      'Understanding how ethics can make you a better person in the workplace is a solid starting point for a commitment to always doing the right thing. Therefore, gaining the trust of your co-workers can enhance your productivity by making it easier for you to communicate and work with others in the workplace.',
      'Employees who spread distrust can meet resistance when seeking help from others, but trusted co-workers can always find a helping hand. Gaining the trust of their managers can open doors to workers for new responsibilities at work, possibly leading to promotions and pay raise.',
      'Adapted from https://smallbusiness.chron.com/ethics-',
    ]),
  );
  nodes.push(
    question(
      `${prefix}_comp_q1`,
      `${prefix}_comp`,
      2,
      'Question 1',
      1.5,
      'Choose the answer to complete each statement.\na) Ethical workers are those who improve ........\n- their profits    - human relationships    - the number of stakeholders.\nb) Workplace can be exposed to ...............\n- unethical practices.    - unfair competition    - regular audits.\nc) Lack of confidence between workers ...........\n- saves time and money    - encourages human contact    - affects work quality.',
      'a) human relationships    b) unethical practices    c) affects work quality',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q2`,
      `${prefix}_comp`,
      3,
      'Question 2',
      1.5,
      'Put the following ideas in the order they appear in the text.\na) Mutual trust is important for cooperation at work.\nb) Workplace code of conduct is concerned with unethical behaviours.\nc) Ethical employees contribute more to their employers’ wealth.',
      'b - c - a',
      '0.5 x 3',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3`,
      `${prefix}_comp`,
      4,
      'Question 3',
      3.5,
      'Answer the following questions according to the text.',
      null,
      null,
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_a`,
      `${prefix}_comp_q3`,
      1,
      'Question 3.a',
      1,
      'What unethical practices do workplace ethics focus on?',
      'discrimination, fraud, theft and harassment.',
      '1 pt (0.25 for each item)',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_b`,
      `${prefix}_comp_q3`,
      2,
      'Question 3.b',
      1,
      'Why is it important to trust your workmates?',
      'because it enhances your productivity by making it easier for you to communicate and work with others in the workplace, or because it improves productivity and makes communication easier between each other at work.',
      '1 pt',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q3_c`,
      `${prefix}_comp_q3`,
      3,
      'Question 3.c',
      1.5,
      'Is confidence between employees and employers fruitful? Justify your answer.',
      'Yes, it is. It can open doors to workers for new responsibilities at work, possibly leading to promotions and pay raise.',
      '1.5 pts',
      'SUBQUESTION',
    ),
  );
  nodes.push(
    question(
      `${prefix}_comp_q4`,
      `${prefix}_comp`,
      5,
      'Question 4',
      1.5,
      'Choose the most appropriate title.\na) Decision making in companies.\nb) Productivity factors in business.\nc) Ethics at the workplace.',
      'The title: Ethics at the Workplace.',
      '1.5 pts',
    ),
  );
  nodes.push(part(`${prefix}_exploration`, `${prefix}_reading`, 2, 'B/ Text Exploration (07 pts)', 7));
  nodes.push(
    question(
      `${prefix}_exp_q1`,
      `${prefix}_exploration`,
      1,
      'Question 1',
      1.5,
      'Find in the text words or phrases that are opposite in meaning to the following:\na) worst (§1)    b) suspicion (§2)    c) reduction (§3)',
      'a) worst (§1) ≠ best\nb) suspicion (§2) ≠ trust\nc) reduction (§3) ≠ raise',
      '0.5 x 3',
    ),
  );
  nodes.push(
    tableQuestion(
      `${prefix}_exp_q2`,
      `${prefix}_exploration`,
      2,
      'Question 2',
      1.5,
      'Complete the chart as shown in the example.',
      [
        ['Verbs', 'Nouns', 'Adjectives'],
        ['E.g. corrupt', 'corruption', 'corrupt'],
        ['To defraud', 'Fraud / fraudster / fraudulence', 'fraudulent'],
        ['To communicate', 'communication', 'Communicative / communicable'],
        ['To value', 'Value / valuation / valuer / valuables', 'Valuable / valueless'],
      ],
      '0.25 x 6; accept any other correct form',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q3`,
      `${prefix}_exploration`,
      3,
      'Question 3',
      2,
      'Combine each pair of sentences with the connectors given between brackets. Make changes where necessary.\na) Some workers generally get promotions. They respect their company’s code of conduct. (as a result)\nb) The manager and the workers trust each other. The company’s productivity increases. (provided that)',
      'a) Some workers respect their company’s code of conduct; as a result, they generally get promotions.\nb) Provided that the manager and the workers trust each other, the company’s productivity will increase.\n- The company’s productivity will increase provided that the manager and the workers trust each other.',
      '1 pt + 1 pt',
    ),
  );
  nodes.push(
    question(
      `${prefix}_exp_q4`,
      `${prefix}_exploration`,
      4,
      'Question 4',
      2,
      'Fill in each gap with the appropriate word from the list given.\ninvolved - obey - professional - consequences\nEthical behaviour and good citizenship can improve your .........(1)......... and social success. In order to be a good citizen, you should consider the .........(2)............... of your actions, .........(3)......... laws and be respectful. By being morally.........(4)........., you encourage others to do the same.',
      '1- professional    2- consequences    3- obey    4- involved',
      '0.5 x 4',
    ),
  );
  addWrittenExpression(nodes, prefix, `${prefix}_reading`, 3, [
    'Topic 1:\nSome people are more likely to feel above the law because they are rich. They lie, steal, cheat and engage in other unethical behaviours because their money makes them feel untouchable.\nWrite an opinion article of about 80 to 120 words for the local newspaper to denounce those people and suggest what you can do to become a good citizen.\nMake the best use of the following notes:\n- encourage whistleblowing\n- engage in anti-corruption associations\n- act ethically and legally\n- respect the rules of the community',
    'Topic 2:\nStudents who live far from schools, where there are no canteens, are likely to eat whatever they can afford for lunch (junk food, chips, sweets...). Therefore, they often fall sick. Write an article of about 80 to 120 words, for your school magazine, where you suggest solutions to help these students make their eating habits healthier.',
  ]);
  return {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes,
  };
}

function addWrittenExpression(
  nodes: ReviewedNode[],
  prefix: string,
  parentId: string,
  orderIndex: number,
  topics: string[],
  streamLabel = 'Common streams',
  scoring: {
    label?: string;
    maxPoints?: number;
    row?: string[];
  } = {},
) {
  const id = `${prefix}_written`;
  const maxPoints = scoring.maxPoints ?? 5;
  nodes.push(
    part(
      id,
      parentId,
      orderIndex,
      scoring.label ?? `Part Two: Written Expression (${String(maxPoints).padStart(2, '0')} pts)`,
      maxPoints,
    ),
  );
  nodes.push(
    question(
      `${prefix}_written_q`,
      id,
      1,
      'Choose only ONE topic',
      maxPoints,
      topics.join('\n\n'),
      null,
      null,
    ),
  );
  nodes[nodes.length - 1].blocks.push(
    table(
      `${prefix}_written_q_rubric`,
      'RUBRIC',
      [
        ['Criteria', 'Relevance', 'Semantic coherence', 'Correct use of English', 'Excellence (vocab & creativity)', 'Final score'],
        scoring.row ?? [streamLabel, '1', '1', '2', '1', String(maxPoints)],
      ],
    ),
  );
}

function addWrittenExpressionTextRubric(
  nodes: ReviewedNode[],
  prefix: string,
  parentId: string,
  orderIndex: number,
  maxPoints: number,
  topics: string[],
  rubric: string,
) {
  const id = `${prefix}_written`;
  nodes.push(
    part(
      id,
      parentId,
      orderIndex,
      `Part Two: Written Expression (${String(maxPoints).padStart(2, '0')} pts)`,
      maxPoints,
    ),
  );
  nodes.push(
    question(
      `${prefix}_written_q`,
      id,
      1,
      'Choose only ONE topic',
      maxPoints,
      topics.join('\n\n'),
      null,
      rubric,
    ),
  );
}

function part(
  id: string,
  parentId: string | null,
  orderIndex: number,
  label: string,
  maxPoints: number,
): ReviewedNode {
  return {
    id,
    nodeType: 'PART',
    parentId,
    orderIndex,
    label,
    maxPoints,
    topicCodes: [],
    blocks: [],
  };
}

function context(
  id: string,
  parentId: string,
  orderIndex: number,
  label: string,
  paragraphs: string[],
): ReviewedNode {
  return {
    id,
    nodeType: 'CONTEXT',
    parentId,
    orderIndex,
    label,
    maxPoints: 0,
    topicCodes: [],
    blocks: paragraphs.map((paragraph, index) =>
      block(`${id}_prompt_${index + 1}`, 'PROMPT', paragraph),
    ),
  };
}

function question(
  id: string,
  parentId: string,
  orderIndex: number,
  label: string,
  maxPoints: number,
  prompt: string,
  solution: string | null,
  rubric: string | null,
  nodeType: NodeType = 'QUESTION',
): ReviewedNode {
  const blocks = [block(`${id}_prompt_1`, 'PROMPT', prompt)];
  if (solution) {
    blocks.push(block(`${id}_solution_1`, 'SOLUTION', solution));
  }
  if (rubric) {
    blocks.push(block(`${id}_rubric_1`, 'RUBRIC', rubric));
  }
  return {
    id,
    nodeType,
    parentId,
    orderIndex,
    label,
    maxPoints,
    topicCodes: [],
    blocks,
  };
}

function tableQuestion(
  id: string,
  parentId: string,
  orderIndex: number,
  label: string,
  maxPoints: number,
  prompt: string,
  rows: string[][],
  rubric: string,
): ReviewedNode {
  return {
    id,
    nodeType: 'QUESTION',
    parentId,
    orderIndex,
    label,
    maxPoints,
    topicCodes: [],
    blocks: [
      block(`${id}_prompt_1`, 'PROMPT', prompt),
      table(`${id}_solution_1`, 'SOLUTION', rows),
      block(`${id}_rubric_1`, 'RUBRIC', rubric),
    ],
  };
}

function block(id: string, role: Role, value: string): ReviewedBlock {
  return {
    id,
    role,
    type: 'paragraph',
    value,
  };
}

function table(id: string, role: Role, rows: string[][]): ReviewedBlock {
  return {
    id,
    role,
    type: 'table',
    value: rows.map((row) => row.join(' | ')).join('\n'),
    data: {
      rows,
    },
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
