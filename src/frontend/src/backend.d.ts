import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface EarningsGoal {
    period: string;
    targetAmount: number;
}
export interface Trip {
    date: bigint;
    tripId: string;
    platform: string;
    durationMinutes: bigint;
    notes: string;
    amount: number;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface Event {
    eventId: string;
    title: string;
    date: bigint;
    description: string;
    category: string;
    isUserCreated: boolean;
    location: string;
}
export interface Shift {
    startTime: string;
    status: string;
    endTime: string;
    date: bigint;
    targetEarnings: number;
    notes: string;
    shiftId: string;
}
export interface VoiceUsage {
    date: bigint;
    count: bigint;
}
export interface Sale {
    saleId: string;
    date: bigint;
    productName: string;
    totalAmount: number;
    quantity: bigint;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface FuelLog {
    cost: number;
    date: bigint;
    distance: number;
    fuelUsed: number;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface ExpenseEntry {
    expenseId: string;
    date: bigint;
    notes: string;
    category: string;
    amount: number;
}
export interface Product {
    name: string;
    sellingPrice: number;
    productId: string;
    currentStock: bigint;
}
export interface UserProfile {
    vehicleName: string;
    displayName: string;
    subscriptionTier: bigint;
    voiceEnabled: boolean;
    currencyCode: string;
    fuelConsumptionRate: number;
}
export interface StakingRecord {
    stakeId: string;
    icpAmount: number;
    dissolveDelayDays: bigint;
    startDate: bigint;
    notes: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCustomEvent(event: Event): Promise<void>;
    addExpense(expense: ExpenseEntry): Promise<void>;
    addFuelLog(fuelLog: FuelLog): Promise<void>;
    addOrUpdateProduct(product: Product): Promise<void>;
    addOrUpdateShift(shift: Shift): Promise<void>;
    addSale(sale: Sale): Promise<void>;
    addTrip(trip: Trip): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createOrUpdateProfile(profile: UserProfile): Promise<void>;
    deleteCustomEvent(eventId: string): Promise<void>;
    deleteExpense(expenseId: string): Promise<void>;
    deleteProduct(productId: string): Promise<void>;
    deleteSale(saleId: string): Promise<void>;
    deleteStakingRecord(stakeId: string): Promise<void>;
    deleteShift(shiftId: string): Promise<void>;
    deleteTrip(tripId: string): Promise<void>;
    elevenLabsTextToSpeech(text: string): Promise<Uint8Array>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomEvents(): Promise<Array<Event>>;
    getEarningsGoal(): Promise<EarningsGoal | null>;
    getEarningsTotal(): Promise<[number, bigint]>;
    getExpenses(): Promise<Array<ExpenseEntry>>;
    getFuelLogs(): Promise<Array<FuelLog>>;
    getFuelProfile(): Promise<{
        vehicleName: string;
        fuelConsumptionRate: number;
    }>;
    getICPPrice(): Promise<string>;
    getLowStockProducts(): Promise<Array<Product>>;
    getProducts(): Promise<Array<Product>>;
    getSales(): Promise<Array<Sale>>;
    getShiftHistory(): Promise<Array<Shift>>;
    getShifts(): Promise<Array<Shift>>;
    getStakingRecords(): Promise<Array<StakingRecord>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getTrips(): Promise<Array<Trip>>;
    getUpcomingShifts(): Promise<Array<Shift>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVoiceUsage(): Promise<VoiceUsage>;
    incrementVoiceUsage(): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    isElevenLabsConfigured(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveFuelProfile(fuelConsumptionRate: number, vehicleName: string): Promise<void>;
    saveStakingRecord(record: StakingRecord): Promise<void>;
    setEarningsGoal(goal: EarningsGoal): Promise<void>;
    setElevenLabsApiKey(key: string): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
