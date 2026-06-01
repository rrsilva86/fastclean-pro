export type CleaningServiceTypeRecord = {
  id: string;
  name: string;
  active: boolean;
  basePrice: string;
};

export type ExtraServiceRecord = {
  id: string;
  name: string;
  active: boolean;
  price: string;
};

export const defaultCleaningServiceTypes: CleaningServiceTypeRecord[] = [
  { id: "regular_cleaning", name: "Regular Cleaning", active: true, basePrice: "$145" },
  { id: "deep_cleaning", name: "Deep Cleaning", active: true, basePrice: "$230" },
  { id: "move_out_cleaning", name: "Move-Out Cleaning", active: true, basePrice: "$260" },
  { id: "airbnb", name: "Airbnb", active: true, basePrice: "$165" },
  { id: "heavy_duty_cleaning", name: "Heavy Duty Cleaning", active: true, basePrice: "$300" },
  { id: "post_construction", name: "Post-Construction", active: true, basePrice: "$380" }
];

export const defaultExtraServices: ExtraServiceRecord[] = [
  { id: "changing_sheets", name: "Changing Sheets and Pillowcases", active: true, price: "$20" },
  { id: "refrigerator_cleaning", name: "Refrigerator Cleaning", active: true, price: "$35" },
  { id: "baseboard_cleaning", name: "Baseboard Cleaning", active: true, price: "$45" },
  { id: "oven_cleaning", name: "Oven Cleaning", active: true, price: "$40" },
  { id: "chandeliers_lamps", name: "Chandeliers and Lamps", active: true, price: "$30" },
  { id: "window_screen_cleaning", name: "Window Screen Cleaning", active: true, price: "$55" }
];
