export function LessonPage({ id }: { id: string; query: URLSearchParams }) {
  return (
    <div className="screen">
      <h1>{id}</h1>
    </div>
  )
}
