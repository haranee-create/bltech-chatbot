export type Character = {
  subject_type: "human" | "animal";
  name: string;
  job: string;
  lifespan: string;
  ending: string;
  life_story: string;
  linked_scene: string;
};

export type GenerateResponse = {
  character: Character;
  era: string;
  image: string; // data URL
};

export type ShareMeta = Pick<Character, "name" | "job" | "ending" | "life_story" | "lifespan"> & {
  era: string;
};
