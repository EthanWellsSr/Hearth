import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Hearth</h1>

      <nav>
        <ul>
          <li>
            <Link href="/todos">To-dos</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
