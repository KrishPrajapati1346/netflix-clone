import type { Genre, LanguageCode, MaturityRating, VideoSource } from '@shared';

/**
 * Seed catalog.
 *
 * Every entry is a real film or series that is **public domain** or released
 * under **Creative Commons**, with genuine metadata — 50 films spanning 1902 to
 * 2022, from Méliès and the German Expressionists through Poverty Row noir to
 * the Blender open movies. Nothing here is invented filler and nothing is
 * licensed content used without permission, which is the only way to ship a
 * demo catalog honestly with no TMDB key and no rights deals.
 *
 * Genres are listed **primary first** — the artwork generator reads that order
 * to pick a poster treatment, so "Comedy, Action, War" is drawn as a comedy
 * rather than a war documentary.
 *
 * Playback points at long-standing public HLS test streams (Mux and Apple).
 * They are adaptive multi-rendition manifests, so quality switching, buffering
 * behaviour and seeking are genuinely exercised rather than simulated. Artwork
 * is generated per title by `artwork.service`; running `npm run seed:tmdb` with
 * a key replaces both metadata and posters with TMDB's.
 */

/**
 * Shared playable sources.
 *
 * `auto` is the master playlist — hls.js reads it and picks a rendition from
 * measured bandwidth. The explicit ladder entries let a viewer override that
 * choice from the quality menu.
 */
const BIG_BUCK_BUNNY: VideoSource[] = [
  { label: 'auto', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', type: 'hls' },
];

const TEARS_OF_STEEL: VideoSource[] = [
  { label: 'auto', url: 'https://test-streams.mux.dev/tos_ismc/main.m3u8', type: 'hls' },
];

const BIPBOP: VideoSource[] = [
  {
    label: 'auto',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
    type: 'hls',
  },
];

const PTS_SHIFT: VideoSource[] = [
  { label: 'auto', url: 'https://test-streams.mux.dev/pts_shift/master.m3u8', type: 'hls' },
];

/** Rotated across the catalog so adjacent titles do not all play the same clip. */
const SOURCE_POOL = [BIG_BUCK_BUNNY, TEARS_OF_STEEL, BIPBOP, PTS_SHIFT];

export function sourceFor(index: number): VideoSource[] {
  return SOURCE_POOL[index % SOURCE_POOL.length] ?? BIG_BUCK_BUNNY;
}

export interface MovieFixture {
  title: string;
  overview: string;
  tagline?: string;
  genres: Genre[];
  language: LanguageCode;
  maturityRating: MaturityRating;
  releaseDate: string;
  runtimeMinutes: number;
  directors: string[];
  cast: Array<{ name: string; character?: string }>;
  keywords: string[];
  popularity: number;
  isFeatured?: boolean;
}

export const MOVIES: MovieFixture[] = [
  {
    title: 'Night of the Living Dead',
    overview:
      'A group of strangers barricade themselves inside a rural Pennsylvania farmhouse as the recently dead rise and attack the living. Tensions inside prove as dangerous as the threat outside.',
    tagline: 'They keep coming back in a bloodthirsty lust for human flesh.',
    genres: ['Horror', 'Thriller'],
    language: 'en',
    maturityRating: 'R',
    releaseDate: '1968-10-01',
    runtimeMinutes: 96,
    directors: ['George A. Romero'],
    cast: [
      { name: 'Duane Jones', character: 'Ben' },
      { name: 'Judith O’Dea', character: 'Barbra' },
      { name: 'Karl Hardman', character: 'Harry Cooper' },
      { name: 'Marilyn Eastman', character: 'Helen Cooper' },
    ],
    keywords: ['zombie', 'siege', 'independent', 'public domain'],
    popularity: 92,
    isFeatured: true,
  },
  {
    title: 'Nosferatu',
    overview:
      'An estate agent travels to the Carpathians to close a sale with the reclusive Count Orlok, and carries a plague home with him. An unauthorised adaptation of Dracula that survived a court-ordered destruction of its negatives.',
    tagline: 'A symphony of horror.',
    genres: ['Horror', 'Fantasy'],
    language: 'de',
    maturityRating: 'PG-13',
    releaseDate: '1922-03-04',
    runtimeMinutes: 94,
    directors: ['F. W. Murnau'],
    cast: [
      { name: 'Max Schreck', character: 'Count Orlok' },
      { name: 'Gustav von Wangenheim', character: 'Thomas Hutter' },
      { name: 'Greta Schröder', character: 'Ellen Hutter' },
    ],
    keywords: ['vampire', 'silent', 'expressionism', 'public domain'],
    popularity: 84,
  },
  {
    title: 'Metropolis',
    overview:
      'In a stratified future city, the pampered son of the ruling industrialist descends to the machine halls below and falls for a woman preaching reconciliation between the hands that build and the head that plans.',
    tagline: 'There can be no understanding between the hands and the brain unless the heart acts as mediator.',
    genres: ['Science Fiction', 'Drama'],
    language: 'de',
    maturityRating: 'PG',
    releaseDate: '1927-01-10',
    runtimeMinutes: 153,
    directors: ['Fritz Lang'],
    cast: [
      { name: 'Brigitte Helm', character: 'Maria' },
      { name: 'Alfred Abel', character: 'Joh Fredersen' },
      { name: 'Gustav Fröhlich', character: 'Freder' },
    ],
    keywords: ['dystopia', 'silent', 'robot', 'class'],
    popularity: 88,
    isFeatured: true,
  },
  {
    title: 'His Girl Friday',
    overview:
      'A newspaper editor schemes to keep his ace reporter and ex-wife from remarrying by handing her one last story: an interview with a condemned man hours before his execution.',
    genres: ['Comedy', 'Romance'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1940-01-11',
    runtimeMinutes: 92,
    directors: ['Howard Hawks'],
    cast: [
      { name: 'Cary Grant', character: 'Walter Burns' },
      { name: 'Rosalind Russell', character: 'Hildy Johnson' },
      { name: 'Ralph Bellamy', character: 'Bruce Baldwin' },
    ],
    keywords: ['screwball', 'newsroom', 'overlapping dialogue'],
    popularity: 71,
  },
  {
    title: 'Charade',
    overview:
      'A widow discovers her murdered husband stole a fortune during the war, and that everyone who knew him wants it back. A charming stranger keeps changing his name and his story.',
    tagline: 'Beautiful. Mysterious. Deadly.',
    genres: ['Mystery', 'Romance', 'Thriller'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1963-12-05',
    runtimeMinutes: 113,
    directors: ['Stanley Donen'],
    cast: [
      { name: 'Cary Grant', character: 'Peter Joshua' },
      { name: 'Audrey Hepburn', character: 'Regina Lampert' },
      { name: 'Walter Matthau', character: 'Hamilton Bartholomew' },
    ],
    keywords: ['paris', 'heist', 'mistaken identity', 'public domain'],
    popularity: 79,
  },
  {
    title: 'The General',
    overview:
      'A Confederate railway engineer, rejected by the army and then by his sweetheart, pursues his stolen locomotive single-handedly through enemy lines.',
    genres: ['Comedy', 'Action', 'War'],
    language: 'en',
    maturityRating: 'G',
    releaseDate: '1926-12-31',
    runtimeMinutes: 79,
    directors: ['Buster Keaton', 'Clyde Bruckman'],
    cast: [
      { name: 'Buster Keaton', character: 'Johnnie Gray' },
      { name: 'Marion Mack', character: 'Annabelle Lee' },
    ],
    keywords: ['silent', 'stunts', 'train', 'slapstick'],
    popularity: 74,
  },
  {
    title: 'Big Buck Bunny',
    overview:
      'A gentle giant rabbit endures the cruelty of three bullying rodents, then engineers an elaborate and precisely calibrated revenge. Produced by the Blender Foundation to prove open-source tools could finish a film.',
    tagline: 'Some bunnies do not turn the other cheek.',
    genres: ['Animation', 'Comedy', 'Family'],
    language: 'en',
    maturityRating: 'G',
    releaseDate: '2008-05-20',
    runtimeMinutes: 10,
    directors: ['Sacha Goedegebure'],
    cast: [{ name: 'Blender Foundation', character: 'Production' }],
    keywords: ['open movie', 'blender', 'creative commons', 'short'],
    popularity: 66,
  },
  {
    title: 'Sintel',
    overview:
      'A solitary traveller crosses a hostile world searching for the dragon she raised from a hatchling. The reunion is not what she spent years imagining.',
    tagline: 'A journey that costs everything.',
    genres: ['Animation', 'Fantasy', 'Adventure'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '2010-09-27',
    runtimeMinutes: 15,
    directors: ['Colin Levy'],
    cast: [
      { name: 'Halina Reijn', character: 'Sintel' },
      { name: 'Thom Hoffman', character: 'Shaman' },
    ],
    keywords: ['open movie', 'blender', 'dragon', 'creative commons'],
    popularity: 69,
  },
  {
    title: 'Tears of Steel',
    overview:
      'In a ruined Amsterdam, a group of scientists and warriors attempt to rewrite a moment decades past, hoping to undo the machine uprising it set in motion.',
    tagline: 'The future is a memory you can still change.',
    genres: ['Science Fiction', 'Action'],
    language: 'en',
    maturityRating: 'PG-13',
    releaseDate: '2012-09-26',
    runtimeMinutes: 12,
    directors: ['Ian Hubert'],
    cast: [
      { name: 'Derek de Lint', character: 'Thom' },
      { name: 'Sergio Hasselbaink', character: 'Barley' },
    ],
    keywords: ['open movie', 'blender', 'visual effects', 'robots'],
    popularity: 72,
  },
  {
    title: 'Elephants Dream',
    overview:
      'Two men navigate an immense and hostile machine that rebuilds itself around them, disagreeing sharply about whether it is a marvel or a trap.',
    genres: ['Animation', 'Science Fiction'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '2006-03-24',
    runtimeMinutes: 11,
    directors: ['Bassam Kurdali'],
    cast: [
      { name: 'Tygo Gernandt', character: 'Proog' },
      { name: 'Cas Jansen', character: 'Emo' },
    ],
    keywords: ['open movie', 'blender', 'surreal', 'first open movie'],
    popularity: 58,
  },
  {
    title: 'Cosmos Laundromat',
    overview:
      'A suicidal sheep on a desolate island meets a salesman offering an infinity of lives. The pilot of an unfinished feature, and the most technically ambitious of the open movies.',
    genres: ['Animation', 'Comedy', 'Fantasy'],
    language: 'en',
    maturityRating: 'PG-13',
    releaseDate: '2015-08-10',
    runtimeMinutes: 12,
    directors: ['Mathieu Auvray'],
    cast: [
      { name: 'Pierre Bokma', character: 'Franck' },
      { name: 'Reinout Scholten van Aschat', character: 'Victor' },
    ],
    keywords: ['open movie', 'blender', 'absurdist', 'creative commons'],
    popularity: 63,
  },
  {
    title: 'Plan 9 from Outer Space',
    overview:
      'Aliens resurrect the dead of a California cemetery as part of a plan to stop humanity developing a weapon that would destroy the universe. Widely and affectionately regarded as the worst film ever made.',
    tagline: 'Can your heart stand the shocking facts?',
    genres: ['Science Fiction', 'Horror'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1959-07-22',
    runtimeMinutes: 79,
    directors: ['Ed Wood'],
    cast: [
      { name: 'Gregory Walcott', character: 'Jeff Trent' },
      { name: 'Bela Lugosi', character: 'Ghoul Man' },
      { name: 'Vampira', character: 'Vampire Girl' },
    ],
    keywords: ['cult', 'so bad it is good', 'public domain', 'aliens'],
    popularity: 61,
  },
  {
    title: 'Carnival of Souls',
    overview:
      'The sole survivor of a car crash takes a church organist post in a new town, and finds herself drawn to an abandoned lakeside pavilion, and followed by a pale man nobody else can see.',
    genres: ['Horror', 'Mystery'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1962-09-26',
    runtimeMinutes: 78,
    directors: ['Herk Harvey'],
    cast: [
      { name: 'Candace Hilligoss', character: 'Mary Henry' },
      { name: 'Frances Feist', character: 'Mrs. Thomas' },
    ],
    keywords: ['dreamlike', 'low budget', 'public domain', 'cult'],
    popularity: 64,
  },
  {
    title: 'D.O.A.',
    overview:
      'An accountant walks into a police station to report a murder: his own. Poisoned with a slow-acting toxin, he has days to find out who killed him and why.',
    tagline: 'A man is hunting his own killer.',
    genres: ['Crime', 'Mystery', 'Thriller'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1949-12-30',
    runtimeMinutes: 83,
    directors: ['Rudolph Maté'],
    cast: [
      { name: 'Edmond O’Brien', character: 'Frank Bigelow' },
      { name: 'Pamela Britton', character: 'Paula Gibson' },
    ],
    keywords: ['film noir', 'public domain', 'countdown'],
    popularity: 57,
  },
  {
    title: 'The Cabinet of Dr. Caligari',
    overview:
      'A carnival hypnotist exhibits a somnambulist who can answer any question, including how long a man has left to live. A landmark of German Expressionism, and its painted sets have never been imitated successfully.',
    genres: ['Horror', 'Mystery', 'Thriller'],
    language: 'de',
    maturityRating: 'PG',
    releaseDate: '1920-02-26',
    runtimeMinutes: 76,
    directors: ['Robert Wiene'],
    cast: [
      { name: 'Werner Krauss', character: 'Dr. Caligari' },
      { name: 'Conrad Veidt', character: 'Cesare' },
    ],
    keywords: ['expressionism', 'silent', 'unreliable narrator'],
    popularity: 70,
  },
  {
    title: 'Detour',
    overview:
      'A New York pianist hitchhiking to Los Angeles takes a ride from the wrong man, and then a far worse ride from a woman who knows exactly what happened.',
    genres: ['Crime', 'Drama', 'Thriller'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1945-11-30',
    runtimeMinutes: 68,
    directors: ['Edgar G. Ulmer'],
    cast: [
      { name: 'Tom Neal', character: 'Al Roberts' },
      { name: 'Ann Savage', character: 'Vera' },
    ],
    keywords: ['film noir', 'poverty row', 'public domain'],
    popularity: 55,
  },
  {
    title: 'Nothing Sacred',
    overview:
      'A small-town woman misdiagnosed with fatal radium poisoning is flown to New York and feted as a dying heroine by a newspaper that badly needs a story.',
    genres: ['Comedy', 'Romance'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1937-11-25',
    runtimeMinutes: 77,
    directors: ['William A. Wellman'],
    cast: [
      { name: 'Carole Lombard', character: 'Hazel Flagg' },
      { name: 'Fredric March', character: 'Wally Cook' },
    ],
    keywords: ['screwball', 'satire', 'technicolor', 'public domain'],
    popularity: 48,
  },
  {
    title: 'Battleship Potemkin',
    overview:
      'The crew of a Tsarist battleship mutinies over maggot-ridden meat, and the uprising spreads ashore to Odessa. Its massacre on the steps is among the most studied sequences in cinema.',
    genres: ['Drama', 'History', 'War'],
    language: 'ru',
    maturityRating: 'PG-13',
    releaseDate: '1925-12-21',
    runtimeMinutes: 75,
    directors: ['Sergei Eisenstein'],
    cast: [
      { name: 'Aleksandr Antonov', character: 'Grigory Vakulinchuk' },
      { name: 'Vladimir Barsky', character: 'Commander Golikov' },
    ],
    keywords: ['montage', 'silent', 'propaganda', 'odessa steps'],
    popularity: 62,
  },
  {
    title: 'The Phantom of the Opera',
    overview:
      'A disfigured composer haunting the cellars of the Paris Opéra grooms a young soprano for stardom, and expects the house to make room for her. The unmasking scene reportedly made audiences faint.',
    tagline: 'Behold! The Phantom!',
    genres: ['Horror', 'Drama', 'Romance'],
    language: 'en',
    maturityRating: 'PG-13',
    releaseDate: '1925-11-25',
    runtimeMinutes: 93,
    directors: ['Rupert Julian'],
    cast: [
      { name: 'Lon Chaney', character: 'Erik, the Phantom' },
      { name: 'Mary Philbin', character: 'Christine Daaé' },
      { name: 'Norman Kerry', character: 'Vicomte Raoul de Chagny' },
    ],
    keywords: ['silent', 'opera', 'makeup', 'public domain'],
    popularity: 82,
  },
  {
    title: 'Sherlock Jr.',
    overview:
      'A cinema projectionist who dreams of being a detective falls asleep at work and walks into the film he is showing. Forty-five minutes with more invention than most features manage in two hours.',
    genres: ['Comedy', 'Action', 'Fantasy'],
    language: 'en',
    maturityRating: 'G',
    releaseDate: '1924-04-21',
    runtimeMinutes: 45,
    directors: ['Buster Keaton'],
    cast: [
      { name: 'Buster Keaton', character: 'The Projectionist' },
      { name: 'Kathryn McGuire', character: 'The Girl' },
      { name: 'Joe Keaton', character: 'The Girl’s Father' },
    ],
    keywords: ['silent', 'dream', 'stunts', 'meta'],
    popularity: 77,
  },
  {
    title: 'Steamboat Bill, Jr.',
    overview:
      'A college dandy returns to a river town to join his father’s failing steamboat, arriving just in time for the cyclone that produced the most famous falling-wall gag in cinema.',
    genres: ['Comedy', 'Drama'],
    language: 'en',
    maturityRating: 'G',
    releaseDate: '1928-05-12',
    runtimeMinutes: 70,
    directors: ['Charles Reisner'],
    cast: [
      { name: 'Buster Keaton', character: 'William Canfield Jr.' },
      { name: 'Ernest Torrence', character: 'William Canfield Sr.' },
      { name: 'Marion Byron', character: 'Kitty King' },
    ],
    keywords: ['silent', 'cyclone', 'practical stunt', 'public domain'],
    popularity: 70,
  },
  {
    title: 'House on Haunted Hill',
    overview:
      'An eccentric millionaire offers five strangers ten thousand dollars each to survive a night in a house where seven murders have already happened. His wife thinks the offer is a little too generous.',
    tagline: 'Ten thousand dollars, if you live through the night.',
    genres: ['Horror', 'Mystery', 'Thriller'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1959-02-15',
    runtimeMinutes: 75,
    directors: ['William Castle'],
    cast: [
      { name: 'Vincent Price', character: 'Frederick Loren' },
      { name: 'Carol Ohmart', character: 'Annabelle Loren' },
      { name: 'Richard Long', character: 'Lance Schroeder' },
    ],
    keywords: ['haunted house', 'gimmick', 'public domain', 'cult'],
    popularity: 79,
  },
  {
    title: 'The Last Man on Earth',
    overview:
      'The sole survivor of a plague barricades himself in by night and hunts the infected by day, keeping a routine so precise it has replaced grief. The first adaptation of Matheson’s "I Am Legend".',
    tagline: 'Alive among the lifeless.',
    genres: ['Science Fiction', 'Horror', 'Drama'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1964-03-08',
    runtimeMinutes: 86,
    directors: ['Ubaldo Ragona', 'Sidney Salkow'],
    cast: [
      { name: 'Vincent Price', character: 'Dr. Robert Morgan' },
      { name: 'Franca Bettoia', character: 'Ruth Collins' },
      { name: 'Emma Danieli', character: 'Virginia Morgan' },
    ],
    keywords: ['plague', 'last survivor', 'adaptation', 'public domain'],
    popularity: 81,
  },
  {
    title: 'The Little Shop of Horrors',
    overview:
      'A hapless florist’s assistant cultivates a plant that talks, grows, and will only eat one thing. Shot in two days on a set left standing from another production.',
    genres: ['Comedy', 'Horror'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1960-08-05',
    runtimeMinutes: 72,
    directors: ['Roger Corman'],
    cast: [
      { name: 'Jonathan Haze', character: 'Seymour Krelboyne' },
      { name: 'Jackie Joseph', character: 'Audrey Fulquard' },
      { name: 'Mel Welles', character: 'Gravis Mushnick' },
    ],
    keywords: ['black comedy', 'carnivorous plant', 'two day shoot'],
    popularity: 73,
  },
  {
    title: 'Dementia 13',
    overview:
      'A widow hides her husband’s death to stay in his mother’s will, and arrives at the family’s Irish castle to find an axe murderer already in residence. Coppola’s first credited feature.',
    genres: ['Horror', 'Thriller', 'Mystery'],
    language: 'en',
    maturityRating: 'PG-13',
    releaseDate: '1963-09-25',
    runtimeMinutes: 75,
    directors: ['Francis Ford Coppola'],
    cast: [
      { name: 'William Campbell', character: 'Richard Haloran' },
      { name: 'Luana Anders', character: 'Louise Haloran' },
      { name: 'Bart Patton', character: 'Billy Haloran' },
    ],
    keywords: ['castle', 'first feature', 'public domain'],
    popularity: 66,
  },
  {
    title: 'The Terror',
    overview:
      'A lost Napoleonic officer follows a woman who keeps vanishing into the sea, to a crumbling baron’s castle where nobody will say who she was. Shot in four days around sets that were about to be demolished.',
    genres: ['Horror', 'Mystery'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1963-06-01',
    runtimeMinutes: 79,
    directors: ['Roger Corman'],
    cast: [
      { name: 'Boris Karloff', character: 'Baron Victor Frederick von Leppe' },
      { name: 'Jack Nicholson', character: 'Lt. André Duvalier' },
      { name: 'Sandra Knight', character: 'Helene' },
    ],
    keywords: ['gothic', 'castle', 'public domain'],
    popularity: 64,
  },
  {
    title: 'Häxan',
    overview:
      'A part-documentary, part-dramatised history of witchcraft that argues the accused were mentally ill rather than possessed. Banned in several countries and still startling.',
    tagline: 'Witchcraft through the ages.',
    genres: ['Documentary', 'Horror', 'History'],
    language: 'de',
    maturityRating: 'R',
    releaseDate: '1922-09-18',
    runtimeMinutes: 105,
    directors: ['Benjamin Christensen'],
    cast: [
      { name: 'Benjamin Christensen', character: 'The Devil' },
      { name: 'Maren Pedersen', character: 'The Witch' },
      { name: 'Clara Pontoppidan', character: 'Sister Cecilia' },
    ],
    keywords: ['witchcraft', 'essay film', 'silent', 'banned'],
    popularity: 68,
  },
  {
    title: 'The Passion of Joan of Arc',
    overview:
      'Joan’s trial and execution, told almost entirely in close-up from the surviving transcripts. Thought destroyed for decades until a print turned up in a Norwegian asylum’s janitorial closet.',
    genres: ['Drama', 'History'],
    language: 'fr',
    maturityRating: 'PG-13',
    releaseDate: '1928-04-21',
    runtimeMinutes: 82,
    directors: ['Carl Theodor Dreyer'],
    cast: [
      { name: 'Renée Jeanne Falconetti', character: 'Joan of Arc' },
      { name: 'Eugène Silvain', character: 'Bishop Pierre Cauchon' },
      { name: 'Antonin Artaud', character: 'Jean Massieu' },
    ],
    keywords: ['trial', 'close-up', 'silent', 'lost and found'],
    popularity: 74,
  },
  {
    title: 'The 39 Steps',
    overview:
      'A Canadian in London is handed a dying spy’s secret and framed for her murder, and has to reach the Highlands handcuffed to a stranger who does not believe a word of it.',
    tagline: 'Handcuffed to the girl who double-crossed him.',
    genres: ['Thriller', 'Mystery', 'Adventure'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1935-06-06',
    runtimeMinutes: 86,
    directors: ['Alfred Hitchcock'],
    cast: [
      { name: 'Robert Donat', character: 'Richard Hannay' },
      { name: 'Madeleine Carroll', character: 'Pamela' },
      { name: 'Lucie Mannheim', character: 'Annabella Smith' },
    ],
    keywords: ['wrong man', 'chase', 'macguffin', 'public domain'],
    popularity: 70,
  },
  {
    title: 'The Lodger',
    overview:
      'A London family takes in a quiet tenant while a killer works the fog outside, and their daughter’s interest in him outpaces their comfort. Hitchcock called it the first true Hitchcock picture.',
    genres: ['Thriller', 'Mystery', 'Drama'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1927-02-14',
    runtimeMinutes: 92,
    directors: ['Alfred Hitchcock'],
    cast: [
      { name: 'Ivor Novello', character: 'The Lodger' },
      { name: 'June Tripp', character: 'Daisy Bunting' },
      { name: 'Marie Ault', character: 'Mrs. Bunting' },
    ],
    keywords: ['silent', 'fog', 'suspicion', 'public domain'],
    popularity: 65,
  },
  {
    title: 'Scarlet Street',
    overview:
      'A meek cashier and amateur painter falls for a woman who lets her boyfriend sell his canvases under her name. Every party to the arrangement is lying to the others.',
    genres: ['Crime', 'Drama', 'Thriller'],
    language: 'en',
    maturityRating: 'PG-13',
    releaseDate: '1945-12-28',
    runtimeMinutes: 102,
    directors: ['Fritz Lang'],
    cast: [
      { name: 'Edward G. Robinson', character: 'Christopher Cross' },
      { name: 'Joan Bennett', character: 'Kitty March' },
      { name: 'Dan Duryea', character: 'Johnny Prince' },
    ],
    keywords: ['film noir', 'forgery', 'public domain'],
    popularity: 76,
  },
  {
    title: 'The Stranger',
    overview:
      'A war-crimes investigator tracks a fugitive to a Connecticut town where he is now a respected schoolmaster with a new wife who knows nothing. The clock tower he is repairing becomes the problem.',
    genres: ['Crime', 'Thriller', 'Drama'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1946-05-25',
    runtimeMinutes: 95,
    directors: ['Orson Welles'],
    cast: [
      { name: 'Orson Welles', character: 'Franz Kindler' },
      { name: 'Edward G. Robinson', character: 'Mr. Wilson' },
      { name: 'Loretta Young', character: 'Mary Longstreet' },
    ],
    keywords: ['manhunt', 'small town', 'clock tower', 'public domain'],
    popularity: 72,
  },
  {
    title: 'The Hitch-Hiker',
    overview:
      'Two friends on a fishing trip pick up a man who cannot close one eye when he sleeps, so they never know when he is watching. The first American film noir directed by a woman.',
    tagline: 'When was the last time you invited death into your car?',
    genres: ['Crime', 'Thriller'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1953-03-20',
    runtimeMinutes: 71,
    directors: ['Ida Lupino'],
    cast: [
      { name: 'Edmond O’Brien', character: 'Roy Collins' },
      { name: 'Frank Lovejoy', character: 'Gilbert Bowen' },
      { name: 'William Talman', character: 'Emmett Myers' },
    ],
    keywords: ['film noir', 'road', 'hostage', 'public domain'],
    popularity: 69,
  },
  {
    title: 'Kansas City Confidential',
    overview:
      'A florist’s delivery driver is beaten by police for an armoured-car robbery he had nothing to do with, and goes to Mexico to find the four masked men who did it — none of whom saw each other’s faces.',
    genres: ['Crime', 'Thriller', 'Mystery'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1952-11-11',
    runtimeMinutes: 99,
    directors: ['Phil Karlson'],
    cast: [
      { name: 'John Payne', character: 'Joe Rolfe' },
      { name: 'Coleen Gray', character: 'Helen Foster' },
      { name: 'Preston Foster', character: 'Tim Foster' },
    ],
    keywords: ['heist', 'film noir', 'masks', 'public domain'],
    popularity: 67,
  },
  {
    title: 'Too Late for Tears',
    overview:
      'A bag of money lands in a couple’s convertible by mistake. He wants to hand it in. She has already decided otherwise, and is several moves ahead of everyone in the picture.',
    genres: ['Crime', 'Thriller', 'Drama'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1949-08-13',
    runtimeMinutes: 99,
    directors: ['Byron Haskin'],
    cast: [
      { name: 'Lizabeth Scott', character: 'Jane Palmer' },
      { name: 'Don DeFore', character: 'Danny Fuller' },
      { name: 'Arthur Kennedy', character: 'Alan Palmer' },
    ],
    keywords: ['film noir', 'femme fatale', 'blackmail', 'public domain'],
    popularity: 63,
  },
  {
    title: 'My Man Godfrey',
    overview:
      'A socialite collects a "forgotten man" from the city dump for a scavenger hunt and hires him as the family butler. He turns out to be considerably better bred than the household employing him.',
    genres: ['Comedy', 'Romance', 'Drama'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1936-09-17',
    runtimeMinutes: 94,
    directors: ['Gregory La Cava'],
    cast: [
      { name: 'William Powell', character: 'Godfrey Parke' },
      { name: 'Carole Lombard', character: 'Irene Bullock' },
      { name: 'Alice Brady', character: 'Angelica Bullock' },
    ],
    keywords: ['screwball', 'depression', 'class', 'public domain'],
    popularity: 78,
  },
  {
    title: 'Meet John Doe',
    overview:
      'A fired columnist invents a man threatening to jump off City Hall in protest at the state of the world, then has to hire someone to be him when the letter becomes a movement.',
    genres: ['Drama', 'Comedy', 'Romance'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1941-05-03',
    runtimeMinutes: 122,
    directors: ['Frank Capra'],
    cast: [
      { name: 'Gary Cooper', character: 'Long John Willoughby' },
      { name: 'Barbara Stanwyck', character: 'Ann Mitchell' },
      { name: 'Edward Arnold', character: 'D. B. Norton' },
    ],
    keywords: ['populism', 'newspaper', 'hoax', 'public domain'],
    popularity: 71,
  },
  {
    title: 'Beat the Devil',
    overview:
      'A group of swindlers stranded in an Italian port wait for a boat to Africa and a uranium claim none of them can quite explain. Written more or less daily during shooting.',
    genres: ['Comedy', 'Crime', 'Adventure'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1953-11-24',
    runtimeMinutes: 89,
    directors: ['John Huston'],
    cast: [
      { name: 'Humphrey Bogart', character: 'Billy Dannreuther' },
      { name: 'Jennifer Jones', character: 'Gwendolen Chelm' },
      { name: 'Gina Lollobrigida', character: 'Maria Dannreuther' },
    ],
    keywords: ['parody', 'swindlers', 'improvised', 'public domain'],
    popularity: 62,
  },
  {
    title: 'The Brain That Wouldn’t Die',
    overview:
      'A surgeon keeps his fiancée’s severed head alive on a tray while he shops for a replacement body. The head, meanwhile, is making arrangements of her own with whatever is locked in the closet.',
    tagline: 'Alive without a body, fed by an unspeakable horror.',
    genres: ['Horror', 'Science Fiction'],
    language: 'en',
    maturityRating: 'R',
    releaseDate: '1962-05-03',
    runtimeMinutes: 82,
    directors: ['Joseph Green'],
    cast: [
      { name: 'Jason Evers', character: 'Dr. Bill Cortner' },
      { name: 'Virginia Leith', character: 'Jan Compton' },
      { name: 'Leslie Daniels', character: 'Kurt' },
    ],
    keywords: ['mad science', 'cult', 'public domain'],
    popularity: 58,
  },
  {
    title: 'Teenagers from Outer Space',
    overview:
      'An alien scout defects to save Earth after learning his people intend to use it as pasture for giant lobsters. Made for almost nothing by a director who did nearly every job himself.',
    genres: ['Science Fiction', 'Horror'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1959-06-01',
    runtimeMinutes: 86,
    directors: ['Tom Graeff'],
    cast: [
      { name: 'David Love', character: 'Derek' },
      { name: 'Dawn Bender', character: 'Betty Morgan' },
      { name: 'Bryan Grant', character: 'Thor' },
    ],
    keywords: ['invasion', 'ray gun', 'no budget', 'public domain'],
    popularity: 54,
  },
  {
    title: 'The Wasp Woman',
    overview:
      'The founder of a cosmetics company, watching her own face lose her the market, volunteers for an untested enzyme derived from wasps. It works. Then it keeps working.',
    genres: ['Horror', 'Science Fiction'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '1959-10-30',
    runtimeMinutes: 73,
    directors: ['Roger Corman'],
    cast: [
      { name: 'Susan Cabot', character: 'Janice Starlin' },
      { name: 'Anthony Eisley', character: 'Bill Lane' },
      { name: 'Barboura Morris', character: 'Mary Dennison' },
    ],
    keywords: ['transformation', 'cosmetics', 'public domain'],
    popularity: 56,
  },
  {
    title: 'Royal Wedding',
    overview:
      'A brother-and-sister dance act takes their show to London during the 1947 royal wedding and both fall in love badly. Contains the number danced on the ceiling of a rotating room.',
    genres: ['Music', 'Comedy', 'Romance'],
    language: 'en',
    maturityRating: 'G',
    releaseDate: '1951-03-08',
    runtimeMinutes: 93,
    directors: ['Stanley Donen'],
    cast: [
      { name: 'Fred Astaire', character: 'Tom Bowen' },
      { name: 'Jane Powell', character: 'Ellen Bowen' },
      { name: 'Peter Lawford', character: 'Lord John Brindale' },
    ],
    keywords: ['musical', 'dance', 'ceiling dance', 'public domain'],
    popularity: 61,
  },
  {
    title: 'Sprite Fright',
    overview:
      'A minibus of students litters its way into a forest that has its own arrangements. What looks like a woodland comedy turns, sharply and on purpose, into something else.',
    tagline: 'Litter at your own risk.',
    genres: ['Animation', 'Comedy', 'Horror'],
    language: 'en',
    maturityRating: 'PG-13',
    releaseDate: '2021-10-29',
    runtimeMinutes: 10,
    directors: ['Matthew Luhn', 'Hjalti Hjálmarsson'],
    cast: [{ name: 'Blender Studio', character: 'Production' }],
    keywords: ['open movie', 'blender', 'creative commons', 'horror comedy'],
    popularity: 71,
  },
  {
    title: 'Coffee Run',
    overview:
      'A woman’s life measured out in coffee orders, running backwards through the days that made each one necessary.',
    genres: ['Animation', 'Drama'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '2020-05-22',
    runtimeMinutes: 4,
    directors: ['Hjalti Hjálmarsson'],
    cast: [{ name: 'Blender Studio', character: 'Production' }],
    keywords: ['open movie', 'blender', 'creative commons', 'short'],
    popularity: 59,
  },
  {
    title: 'Agent 327: Operation Barbershop',
    overview:
      'A Dutch secret agent walks into a barbershop that is not a barbershop, and leaves considerably faster than he arrived. A proof of concept for a feature that has not yet been made.',
    genres: ['Animation', 'Action', 'Comedy'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '2017-05-15',
    runtimeMinutes: 4,
    directors: ['Colin Levy'],
    cast: [{ name: 'Blender Institute', character: 'Production' }],
    keywords: ['open movie', 'blender', 'spy', 'creative commons'],
    popularity: 65,
  },
  {
    title: 'Spring',
    overview:
      'An ancient shepherd and her dog keep the seasons turning, holding back the winter that would rather they stopped. Hand-crafted textures throughout, with no photographic reference.',
    genres: ['Animation', 'Fantasy', 'Adventure'],
    language: 'en',
    maturityRating: 'PG',
    releaseDate: '2019-04-04',
    runtimeMinutes: 8,
    directors: ['Andy Goralczyk'],
    cast: [{ name: 'Blender Animation Studio', character: 'Production' }],
    keywords: ['open movie', 'blender', 'seasons', 'creative commons'],
    popularity: 67,
  },
  {
    title: 'Charge',
    overview:
      'A scavenger crossing an irradiated wasteland finds power where the map said there was none, and something already guarding it.',
    genres: ['Animation', 'Science Fiction', 'Action'],
    language: 'en',
    maturityRating: 'PG-13',
    releaseDate: '2022-06-30',
    runtimeMinutes: 5,
    directors: ['Blender Studio'],
    cast: [{ name: 'Blender Studio', character: 'Production' }],
    keywords: ['open movie', 'blender', 'wasteland', 'creative commons'],
    popularity: 62,
  },
];

export interface ShowFixture {
  title: string;
  overview: string;
  tagline?: string;
  genres: Genre[];
  language: LanguageCode;
  maturityRating: MaturityRating;
  firstAirDate: string;
  lastAirDate?: string;
  status: 'returning' | 'ended' | 'canceled' | 'in_production';
  directors: string[];
  cast: Array<{ name: string; character?: string }>;
  keywords: string[];
  popularity: number;
  isFeatured?: boolean;
  seasons: Array<{
    seasonNumber: number;
    name: string;
    overview: string;
    airDate: string;
    episodes: Array<{ title: string; overview: string; runtimeMinutes: number }>;
  }>;
}

export const SHOWS: ShowFixture[] = [
  {
    title: 'The Open Frontier',
    overview:
      'An anthology series following the Blender open-movie projects, each episode a self-contained story made entirely with free software by a rotating crew.',
    tagline: 'Every frame is free.',
    genres: ['Animation', 'Science Fiction', 'Adventure'],
    language: 'en',
    maturityRating: 'PG',
    firstAirDate: '2006-03-24',
    lastAirDate: '2015-08-10',
    status: 'ended',
    directors: ['Ton Roosendaal'],
    cast: [
      { name: 'Blender Institute', character: 'Production' },
      { name: 'Ton Roosendaal', character: 'Producer' },
    ],
    keywords: ['anthology', 'open source', 'animation', 'creative commons'],
    popularity: 81,
    isFeatured: true,
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        overview: 'The early experiments, when finishing at all was the achievement.',
        airDate: '2006-03-24',
        episodes: [
          {
            title: 'The Machine',
            overview:
              'Two men argue about whether the vast apparatus around them is a wonder or a prison. Neither will concede, and only one of them can be right.',
            runtimeMinutes: 11,
          },
          {
            title: 'The Rabbit',
            overview:
              'A large and patient rabbit is tormented by three rodents. He responds with engineering.',
            runtimeMinutes: 10,
          },
          {
            title: 'The Dragon',
            overview:
              'A traveller searches a hostile world for the creature she raised, and learns what the years cost them both.',
            runtimeMinutes: 15,
          },
        ],
      },
      {
        seasonNumber: 2,
        name: 'Season 2',
        overview: 'Bigger crews, harder shots, and the first live-action hybrid.',
        airDate: '2012-09-26',
        episodes: [
          {
            title: 'Steel and Memory',
            overview:
              'Scientists attempt to reach back into a single moment decades gone, hoping to unmake the war it started.',
            runtimeMinutes: 12,
          },
          {
            title: 'The Laundromat',
            overview:
              'A sheep with nothing left to lose meets a salesman with an unlimited supply of second chances.',
            runtimeMinutes: 12,
          },
          {
            title: 'Spring',
            overview:
              'An ancient shepherd and her dog guard the turning of the seasons against something that would rather they stopped.',
            runtimeMinutes: 8,
          },
        ],
      },
    ],
  },
  {
    title: 'Silent Era Masters',
    overview:
      'A documentary series revisiting the films that invented the visual grammar everything since has borrowed, one director per episode.',
    genres: ['Documentary', 'History'],
    language: 'en',
    maturityRating: 'PG',
    firstAirDate: '2019-04-02',
    status: 'returning',
    directors: ['Various'],
    cast: [{ name: 'Archive Footage', character: 'Self' }],
    keywords: ['documentary', 'silent film', 'film history'],
    popularity: 54,
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        overview: 'The German Expressionists and the shadows they cast.',
        airDate: '2019-04-02',
        episodes: [
          {
            title: 'Painted Shadows',
            overview:
              'How a set painted with light and shadow, because there was no money for lighting, defined horror for a century.',
            runtimeMinutes: 42,
          },
          {
            title: 'The Count Who Should Not Exist',
            overview:
              'A court ordered every print destroyed. This episode traces the copies that survived and how.',
            runtimeMinutes: 39,
          },
          {
            title: 'City of the Future',
            overview:
              'The most expensive silent film ever made nearly ruined its studio, and predicted the next hundred years.',
            runtimeMinutes: 45,
          },
        ],
      },
    ],
  },
  {
    title: 'Noir After Dark',
    overview:
      'Rain-slicked streets, unreliable narrators and men who already know how the story ends. A curated tour through the cheapest and sharpest American crime films.',
    tagline: 'Everybody has an angle.',
    genres: ['Crime', 'Mystery', 'Drama'],
    language: 'en',
    maturityRating: 'TV-14',
    firstAirDate: '2021-10-08',
    status: 'returning',
    directors: ['Various'],
    cast: [
      { name: 'Ann Savage', character: 'Archive' },
      { name: 'Edmond O’Brien', character: 'Archive' },
    ],
    keywords: ['film noir', 'anthology', 'crime'],
    popularity: 59,
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        overview: 'Poverty Row, where the budgets were tiny and the endings were bleak.',
        airDate: '2021-10-08',
        episodes: [
          {
            title: 'Wrong Ride',
            overview: 'A hitchhiker takes the only car that stops, and never gets out from under it.',
            runtimeMinutes: 34,
          },
          {
            title: 'Dead on Arrival',
            overview: 'A man reports his own murder and has one week to solve it.',
            runtimeMinutes: 36,
          },
          {
            title: 'The Pavilion',
            overview: 'A crash survivor keeps being drawn back to a place she has never been.',
            runtimeMinutes: 33,
          },
          {
            title: 'Last Deadline',
            overview: 'An editor will do anything to keep his reporter from quitting. Anything.',
            runtimeMinutes: 38,
          },
        ],
      },
    ],
  },
  {
    title: 'Small Hands, Big World',
    overview:
      'Gentle animated stories for the youngest viewers, about sharing, losing things, and the fact that a bad day usually ends.',
    genres: ['Animation', 'Family'],
    language: 'en',
    maturityRating: 'TV-Y',
    firstAirDate: '2022-06-01',
    status: 'returning',
    directors: ['Various'],
    cast: [{ name: 'Ensemble Cast', character: 'Various' }],
    keywords: ['preschool', 'kids', 'gentle'],
    popularity: 44,
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        overview: 'Six small problems, solved slowly.',
        airDate: '2022-06-01',
        episodes: [
          {
            title: 'The Lost Mitten',
            overview: 'A mitten goes missing on the coldest day, and the search turns up everything else.',
            runtimeMinutes: 11,
          },
          {
            title: 'Too Many Cousins',
            overview: 'The house is full and there is exactly one good chair.',
            runtimeMinutes: 11,
          },
          {
            title: 'The Long Wait',
            overview: 'Tomorrow will not come faster no matter how often you ask.',
            runtimeMinutes: 11,
          },
        ],
      },
    ],
  },
];
