const files = import.meta.glob('./**/*.sql', { as: 'raw', eager: true }) as Record<string, string>;

const cache = new Map<string, string>();

export function getSQL(name: string): string {
    if (!cache.has(name)) {
        const match = Object.entries(files).find(([p]) => p.endsWith(`/${name}.sql`));
        if (!match) {
            throw new Error(`SQL not found: ${name}`);
        }
        cache.set(name, stripComments(match[1]));
    }
    return cache.get(name)!;
}

function stripComments(sql: string) {
    return sql.split('\n').filter((l) => (!l.trim().startsWith('--'))).join('\n').trim();
}
