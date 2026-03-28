export function getPaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = 10,
) {
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.max(
    1,
    Math.min(100, Number(searchParams.get('limit') ?? defaultLimit)),
  );

  return { page, limit };
}
