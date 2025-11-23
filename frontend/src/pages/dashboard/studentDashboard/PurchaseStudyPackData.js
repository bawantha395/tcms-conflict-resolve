const studyPacks = [
  {
    id: 0,
    title: 'Advanced Mathematics - Complete Revision',
    teacher: 'Mr. K. Perera',
    price: '2500',
    image: '/assets/nfts/Nft3.png',
    description: 'A comprehensive study pack covering advanced topics with videos, notes and external references.',
    videos: [
      { id: 'v1', title: 'Calculus - Lecture 1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { id: 'v2', title: 'Algebra - Techniques', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    ],
    documents: [
      { id: 'd1', title: 'Notes - Chapter 1', url: '/assets/sample-pdf/sample1.pdf' },
      { id: 'd2', title: 'Past Paper Solutions', url: '/assets/sample-pdf/sample2.pdf' }
    ],
    links: [
      { id: 'l1', title: 'Reference: Khan Academy', url: 'https://www.khanacademy.org' }
    ]
  },
  {
    id: 1,
    title: 'Physics Foundations',
    teacher: 'Dr. N. Silva',
    price: '1800',
    image: '/assets/nfts/Nft1.png',
    description: 'Clear conceptual videos and concise notes for fundamental physics topics.',
    videos: [
      { id: 'v3', title: 'Mechanics Overview', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    ],
    documents: [
      { id: 'd3', title: 'Worked Examples', url: '/assets/sample-pdf/sample3.pdf' }
    ],
    links: []
  }
];

export default studyPacks;