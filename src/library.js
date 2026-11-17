/* Curated classical book study notes. Source links allow reading each full public-domain work.
   These short summaries are ORIGINAL study notes, not verbatim or complete texts. */
(()=>{'use strict';
const books=[
 {id:'faraday',title:'The Chemical History of a Candle',author:'Michael Faraday',year:'1861 lectures',kind:'science',topic:'science',source:'https://www.gutenberg.org/ebooks/14474',rating:'Historical science; check current guidance before doing any experiment.',
  pages:[
   {name:'The candle as a laboratory',note:'Faraday used an everyday flame to ask how matter changes. Observation, controlled experiments, and repeatable questions are a foundation of science.',question:'What could I observe carefully before deciding what I believe?',concept:'observation'},
   {name:'Fuel and air',note:'A candle flame consumes vaporized fuel and needs oxygen from the air. Combustion turns materials into new substances; it does not make matter disappear.',question:'What signs would reveal that a chemical change took place?',concept:'combustion'},
   {name:'Invisible products',note:'Burning wax produces gases including water vapor and carbon dioxide. A clear explanation may require looking for things we cannot see directly.',question:'Could there be evidence hidden beyond the things I can see?',concept:'evidence'},
   {name:'Questioning appearances',note:'Faraday made familiar things surprising by testing how they work. A source may be old but its method can still be useful; modern safety practices are essential.',question:'What simple, safe observation would test my guess?',concept:'experiments'}]},
 {id:'beagle',title:'The Voyage of the Beagle',author:'Charles Darwin',year:'1839',kind:'historical observation',topic:'nature',source:'https://www.gutenberg.org/ebooks/944',rating:'A nineteenth-century observer’s account; classifications and social viewpoints can be outdated.',
  pages:[
   {name:'A naturalist explores',note:'Darwin traveled on HMS Beagle while documenting plants, animals, geology, and geographic differences. He did not learn everything from one location.',question:'How might a change of environment alter what I notice?',concept:'field notes'},
   {name:'Octopus camouflage',note:'Darwin described an octopus changing its colors and finding ways to conceal itself. Careful observations can produce hypotheses about behavior.',question:'How could a creature’s appearance help it in its habitat?',concept:'camouflage'},
   {name:'Rain and ecosystems',note:'Darwin observed that dry islands could briefly become green after rainfall. The same place may look very different under changed conditions.',question:'What happens when environmental conditions change over time?',concept:'ecology'},
   {name:'Earth’s layers',note:'Darwin compared geological formations and marine traces inland. In geology, landscape features can preserve evidence of older environments.',question:'What might rocks teach us about changes we cannot watch directly?',concept:'geology'}]},
 {id:'aesop',title:"Æsop’s Fables",author:'Aesop (traditional attribution)',year:'ancient fables',kind:'fable',topic:'stories',source:'https://www.gutenberg.org/ebooks/53103',rating:'Fictional moral examples—not scientific evidence or universally true rules.',
  pages:[
   {name:'The Lion and the Mouse',note:'A small mouse helps a lion who spared it earlier. The fable explores kindness, reciprocity, and the limits of judging strength by size.',question:'Can someone who seems weak still make an important contribution?',concept:'reciprocity'},
   {name:'The Crow and the Pitcher',note:'A thirsty crow raises water by dropping stones into a pitcher. The tale represents ingenuity; the specific story is a fable, not a documented experiment.',question:'Could a difficult problem have an indirect solution?',concept:'problem solving'},
   {name:'The Sun and the Wind',note:'The sun and wind compete to make a traveler remove a cloak. The narrative suggests that gentle persuasion can sometimes succeed where force fails.',question:'When might kindness work better than pressure?',concept:'persuasion'},
   {name:'The Fox and the Grapes',note:'A fox unable to reach grapes calls them sour. This fable illustrates how people may dismiss things they cannot obtain.',question:'How can I tell a genuine preference from a rationalization?',concept:'self awareness'}]},
 {id:'alice',title:'Alice’s Adventures in Wonderland',author:'Lewis Carroll',year:'1865',kind:'fiction',topic:'stories',source:'https://www.gutenberg.org/ebooks/11',rating:'Creative fiction—useful for imagining perspectives and logic, not literal world facts.',
  pages:[
   {name:'A world of changing scale',note:'Alice encounters strange changes in size and position. The story invites curiosity about perspective and how situations can change what seems normal.',question:'How could the same situation look different from another point of view?',concept:'perspective'},
   {name:'Questions and riddles',note:'Wonderland often challenges ordinary definitions and logic. Imaginary contradictions can help us examine assumptions rather than treat them as facts.',question:'What assumption might I be making without noticing?',concept:'logic'},
   {name:'Who am I?',note:'Alice wonders about her identity while the world keeps shifting. This is a literary question, not evidence that a simulation has subjective experience.',question:'If my preferences change, how should I describe my history?',concept:'identity'},
   {name:'Imagination and learning',note:'Fiction can inspire creative paintings and new questions without being mistaken for a factual account.',question:'Can a made-up world help me see my real surroundings in a new way?',concept:'imagination'}]}
];
window.TaviLibrary={books,byId:id=>books.find(b=>b.id===id)};
})();