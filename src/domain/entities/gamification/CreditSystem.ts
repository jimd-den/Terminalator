export class CreditSystem {
    private _balance: number = 0;

    get balance(): number {
        return this._balance;
    }

    add(amount: number): void {
        this._balance += amount;
    }

    subtract(amount: number): void {
        this._balance = Math.max(0, this._balance - amount);
    }
}
