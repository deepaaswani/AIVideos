export function GET() {
  return Response.json({
    status: 'ok',
    service: 'aivideos-web',
    apiVersion: 'v1',
  });
}
