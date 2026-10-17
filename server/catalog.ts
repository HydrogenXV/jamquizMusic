import type { GenreId, Track } from '../shared/types';

// Curated seed catalog. Previews + artwork are resolved at runtime via the iTunes Search API.
const RAW: Record<Exclude<GenreId, 'custom'>, string[]> = {
  pop: [
    'Blinding Lights|The Weeknd|2019', 'Shape of You|Ed Sheeran|2017', 'bad guy|Billie Eilish|2019',
    'Levitating|Dua Lipa|2020', 'As It Was|Harry Styles|2022', 'Flowers|Miley Cyrus|2023',
    'Anti-Hero|Taylor Swift|2022', 'Rolling in the Deep|Adele|2010', 'Uptown Funk|Mark Ronson|2014',
    'Toxic|Britney Spears|2003', 'Umbrella|Rihanna|2007', 'Firework|Katy Perry|2010',
    'drivers license|Olivia Rodrigo|2021', 'Espresso|Sabrina Carpenter|2024', 'Poker Face|Lady Gaga|2008',
    'Halo|Beyoncé|2008', 'Stay|The Kid LAROI|2021', 'Watermelon Sugar|Harry Styles|2019',
  ],
  rock: [
    'Bohemian Rhapsody|Queen|1975', 'Hotel California|Eagles|1976', 'Smells Like Teen Spirit|Nirvana|1991',
    "Sweet Child O' Mine|Guns N' Roses|1987", 'Back in Black|AC/DC|1980', 'Stairway to Heaven|Led Zeppelin|1971',
    "Livin' on a Prayer|Bon Jovi|1986", "Don't Stop Believin'|Journey|1981", 'Mr. Brightside|The Killers|2004',
    'Seven Nation Army|The White Stripes|2003', 'Wonderwall|Oasis|1995', 'Paint It Black|The Rolling Stones|1966',
    'Enter Sandman|Metallica|1991', 'Highway to Hell|AC/DC|1979', 'Under the Bridge|Red Hot Chili Peppers|1992',
    'Born to Run|Bruce Springsteen|1975', 'Come As You Are|Nirvana|1991',
  ],
  hiphop: [
    'Lose Yourself|Eminem|2002', 'HUMBLE.|Kendrick Lamar|2017', "God's Plan|Drake|2018",
    'SICKO MODE|Travis Scott|2018', 'In Da Club|50 Cent|2003', 'Gin and Juice|Snoop Dogg|1994',
    'Juicy|The Notorious B.I.G.|1994', 'California Love|2Pac|1995', 'Hotline Bling|Drake|2015',
    'Stronger|Kanye West|2007', 'Gold Digger|Kanye West|2005', 'Old Town Road|Lil Nas X|2019',
    'Not Like Us|Kendrick Lamar|2024', 'Hey Ya!|OutKast|2003', 'Super Bass|Nicki Minaj|2010',
    "Rapper's Delight|The Sugarhill Gang|1979", 'Empire State of Mind|JAY-Z|2009',
  ],
  kpop: [
    'Dynamite|BTS|2020', 'Gangnam Style|PSY|2012', 'How You Like That|BLACKPINK|2020',
    'DDU-DU DDU-DU|BLACKPINK|2018', 'Butter|BTS|2021', 'Super Shy|NewJeans|2023', 'Hype Boy|NewJeans|2022',
    'Next Level|aespa|2021', 'LALISA|LISA|2021', 'LOVE DIVE|IVE|2022', 'FANCY|TWICE|2019',
    "God's Menu|Stray Kids|2020", 'Fantastic Baby|BIGBANG|2012', 'ANTIFRAGILE|LE SSERAFIM|2022',
    'APT.|ROSÉ|2024', 'Seven|Jung Kook|2023', 'Magnetic|ILLIT|2024',
  ],
  edm: [
    'Titanium|David Guetta|2011', 'Levels|Avicii|2011', 'Wake Me Up|Avicii|2013', 'Animals|Martin Garrix|2013',
    'Lean On|Major Lazer|2015', 'Clarity|Zedd|2012', "Don't You Worry Child|Swedish House Mafia|2012",
    'One More Time|Daft Punk|2000', 'Get Lucky|Daft Punk|2013', 'Summer|Calvin Harris|2014',
    'Faded|Alan Walker|2015', 'Closer|The Chainsmokers|2016', 'Turn Down for What|DJ Snake|2013',
    'Strobe|deadmau5|2009', 'Bangarang|Skrillex|2011', 'Sandstorm|Darude|1999', 'Insomnia|Faithless|1995',
  ],
  synthwave: [
    'Take On Me|a-ha|1985', 'Billie Jean|Michael Jackson|1982', 'Sweet Dreams (Are Made of This)|Eurythmics|1983',
    "Don't You Want Me|The Human League|1981", 'Blue Monday|New Order|1983', 'Tainted Love|Soft Cell|1981',
    'Girls Just Want to Have Fun|Cyndi Lauper|1983', 'Like a Prayer|Madonna|1989',
    'Never Gonna Give You Up|Rick Astley|1987', 'Everybody Wants to Rule the World|Tears for Fears|1985',
    'Enjoy the Silence|Depeche Mode|1990', 'Rhythm Is a Dancer|Snap!|1992', 'What Is Love|Haddaway|1993',
    'Nightcall|Kavinsky|2010', 'Wannabe|Spice Girls|1996', '...Baby One More Time|Britney Spears|1998',
    'Blue (Da Ba Dee)|Eiffel 65|1998',
  ],
  thai: [
    'ลาลาลอย|The TOYS|2018', 'เวลาเธอยิ้ม|Polycat|2016', 'ฝนตกไหม|Three Man Down|2019',
    'Lover Boy|Phum Viphurit|2017', 'Hello, Anxiety|Phum Viphurit|2019', 'ทรงอย่างแบด|Paper Planes|2021',
    'ถ้าเราเจอกันอีก|Tilly Birds|2020', 'ไกลแค่ไหนคือใกล้|Getsunova|2012', 'Mango Sticky Rice|MILLI|2022',
    'ROCKSTAR|LISA|2024', 'ทางของฝุ่น|Atom Chanakan|2017', 'แพ้ทาง|Labanoon|2016',
  ],
};

export const CATALOG: Record<string, Track[]> = Object.fromEntries(
  Object.entries(RAW).map(([genre, list]) => [
    genre,
    list.map((row, i) => {
      const [title, artist, year] = row.split('|');
      return { id: `${genre}-${i}`, title, artist, year: Number(year), genre: genre as GenreId };
    }),
  ]),
);

export const ALL_TRACKS: Track[] = Object.values(CATALOG).flat();
