export interface OrderedDateTreeStruct<T> {
    [year: string]: {
        [month: string]: {
            [day: string]: T[];
        };
    };
}

export class OrderedDateTree<T extends { transactionID: string }> {

    private tree: OrderedDateTreeStruct<T> = {};
    private numberOfItems: number = 0;

    add(date: Date, item: T) {
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        // grow branch as needed
        if (!this.tree[year]) {
            this.tree[year] = {};
        }
        if (!this.tree[year][month]) {
            this.tree[year][month] = {};
        }
        if (!this.tree[year][month][day]) {
            this.tree[year][month][day] = [];
        }
        
        // ensure no duplicates
        if (this.tree[year][month][day].find(i => i.transactionID === item.transactionID)) {
            return;
        }

        // insert
        this.tree[year][month][day].push(item);
        this.numberOfItems += 1;

        // sort leaf list
        // this.tree[year][month][day].sort((a, b) => {
        //     const dateA = (a as any).timestamp ? new Date((a as any).timestamp) : new Date(0);
        //     const dateB = (b as any).timestamp ? new Date((b as any).timestamp) : new Date(0);
        //     return dateB.getTime() - dateA.getTime();
        // }); // XXX: this should be insertion sorted
    }

    getTree() {
        return this.tree;
    }

    graft(other: OrderedDateTree<T>) {
        const otherTree = other.getTree();
        for (const year in otherTree) {
            for (const month in otherTree[year]) {
                for (const day in otherTree[year][month]) {
                    for (const item of otherTree[year][month][day]) {
                        this.add(new Date((item as any).timestamp), item);
                    }
                }
            }
        }
    }

    count() {
        return this.numberOfItems;
    }

}

export function newOrderedDateTreeFromList<T extends { transactionID: string }>(items: T[], getDate: (item: T) => Date): OrderedDateTree<T> {
    const tree = new OrderedDateTree<T>();
    for (const item of items) {
        tree.add(getDate(item), item);
    }
    return tree;
}
