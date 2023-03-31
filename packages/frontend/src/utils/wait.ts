export default async (t: number) => {
  return new Promise((resolve) => setTimeout(resolve, t));
};
