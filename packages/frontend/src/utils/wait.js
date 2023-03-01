export default async (t) => {
  console.log(t);
  return new Promise((resolve) => setTimeout(resolve, t));
};
