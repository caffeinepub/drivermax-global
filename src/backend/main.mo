
import OutCall "http-outcalls/outcall";
import Stripe "stripe/stripe";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Blob "mo:core/Blob";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import IC "ic:aaaaa-aa";

actor {
  // Types
  type UserId = Principal;

  public type UserProfile = {
    displayName : Text;
    currencyCode : Text;
    subscriptionTier : Nat;
    voiceEnabled : Bool;
    fuelConsumptionRate : Float;
    vehicleName : Text;
  };

  public type Trip = {
    tripId : Text;
    date : Int;
    platform : Text;
    amount : Float;
    durationMinutes : Nat;
    notes : Text;
  };

  public type Product = {
    productId : Text;
    name : Text;
    sellingPrice : Float;
    currentStock : Nat;
  };

  public type Sale = {
    saleId : Text;
    productName : Text;
    quantity : Nat;
    totalAmount : Float;
    date : Int;
  };

  public type Shift = {
    shiftId : Text;
    date : Int;
    startTime : Text;
    endTime : Text;
    targetEarnings : Float;
    status : Text; // planned/completed/cancelled
    notes : Text;
  };

  public type VoiceUsage = {
    date : Int;
    count : Nat;
  };

  public type StripeSessionMetadata = {
    sessionId : Text;
    userId : ?Principal;
  };

  public type ExpenseEntry = {
    expenseId : Text;
    category : Text;
    amount : Float;
    date : Int;
    notes : Text;
  };

  public type EarningsGoal = {
    targetAmount : Float;
    period : Text;
  };

  public type FuelLog = {
    date : Int;
    distance : Float;
    fuelUsed : Float;
    cost : Float;
  };

  public type Event = {
    eventId : Text;
    title : Text;
    description : Text;
    date : Int;
    location : Text;
    category : Text;
    isUserCreated : Bool;
  };

  public type StakingRecord = {
    stakeId : Text;
    icpAmount : Float;
    dissolveDelayDays : Nat;
    startDate : Int;
    notes : Text;
  };

  module Trip {
    public func compare(a : Trip, b : Trip) : Order.Order {
      Text.compare(a.tripId, b.tripId);
    };
  };

  module Product {
    public func compare(a : Product, b : Product) : Order.Order {
      Text.compare(a.productId, b.productId);
    };
  };

  module Sale {
    public func compare(a : Sale, b : Sale) : Order.Order {
      Int.compare(a.date, b.date);
    };
  };

  module Shift {
    public func compare(a : Shift, b : Shift) : Order.Order {
      Int.compare(a.date, b.date);
    };
  };

  module Event {
    public func compare(a : Event, b : Event) : Order.Order {
      Int.compare(a.date, b.date);
    };
  };

  // Persistent State

  // Component: Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let profiles = Map.empty<UserId, UserProfile>();
  let trips = Map.empty<UserId, Map.Map<Text, Trip>>();
  let products = Map.empty<UserId, Map.Map<Text, Product>>();
  let sales = Map.empty<UserId, Map.Map<Text, Sale>>();
  let shifts = Map.empty<UserId, Map.Map<Text, Shift>>();
  let voiceUsage = Map.empty<UserId, VoiceUsage>();
  let expenses = Map.empty<UserId, Map.Map<Text, ExpenseEntry>>();
  let goals = Map.empty<UserId, EarningsGoal>();
  let fuelLogs = Map.empty<UserId, Map.Map<Int, FuelLog>>();
  let events = Map.empty<UserId, Map.Map<Text, Event>>();
  let stakingRecords = Map.empty<UserId, Map.Map<Text, StakingRecord>>();

  var shiftCounter = 0;
  var tripCounter = 0;

  // ElevenLabs API key stored securely in backend (never exposed to frontend)
  var elevenLabsApiKey : Text = "";

  // Helper Functions
  func getUserTrips(userId : UserId) : Map.Map<Text, Trip> {
    switch (trips.get(userId)) {
      case (null) { Runtime.trap("No trips found for user") };
      case (?userTrips) { userTrips };
    };
  };

  func getUserProducts(userId : UserId) : Map.Map<Text, Product> {
    switch (products.get(userId)) {
      case (null) { Runtime.trap("No products found for user") };
      case (?userProducts) { userProducts };
    };
  };

  func getUserSales(userId : UserId) : Map.Map<Text, Sale> {
    switch (sales.get(userId)) {
      case (null) { Runtime.trap("No sales found for user") };
      case (?userSales) { userSales };
    };
  };

  func getUserShifts(userId : UserId) : Map.Map<Text, Shift> {
    switch (shifts.get(userId)) {
      case (null) { Runtime.trap("No shifts found for user") };
      case (?userShifts) { userShifts };
    };
  };

  func getUserFuelLogs(userId : UserId) : Map.Map<Int, FuelLog> {
    switch (fuelLogs.get(userId)) {
      case (null) { Runtime.trap("No fuel logs found for user") };
      case (?userFuelLogs) { userFuelLogs };
    };
  };

  func getUserExpenses(userId : UserId) : Map.Map<Text, ExpenseEntry> {
    switch (expenses.get(userId)) {
      case (null) { Map.empty<Text, ExpenseEntry>() };
      case (?userExpenses) { userExpenses };
    };
  };

  // User Management
  public shared ({ caller }) func createOrUpdateProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create or update profiles");
    };
    let updatedProfile : UserProfile = {
      profile with
      currencyCode = if (profile.currencyCode == "") {
        "ZAR";
      } else {
        profile.currencyCode;
      };
    };
    profiles.add(caller, updatedProfile);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    profiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    let updatedProfile : UserProfile = {
      profile with
      currencyCode = if (profile.currencyCode == "") {
        "ZAR";
      } else {
        profile.currencyCode;
      };
    };
    profiles.add(caller, updatedProfile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    profiles.get(user);
  };

  // Trip Management
  public shared ({ caller }) func addTrip(trip : Trip) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add trips");
    };
    let userTrips = switch (trips.get(caller)) {
      case (null) { Map.empty<Text, Trip>() };
      case (?trips) { trips };
    };

    let tripWithCurrentDate = {
      trip with
      date = Time.now();
    };

    userTrips.add(trip.tripId, tripWithCurrentDate);
    trips.add(caller, userTrips);
  };

  public query ({ caller }) func getTrips() : async [Trip] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view trips");
    };
    let userTrips = getUserTrips(caller);
    userTrips.values().toArray().sort();
  };

  public shared ({ caller }) func deleteTrip(tripId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete trips");
    };
    let userTrips = switch (trips.get(caller)) {
      case (null) { Map.empty<Text, Trip>() };
      case (?t) { t };
    };
    userTrips.remove(tripId);
    trips.add(caller, userTrips);
  };

  // Product Management
  public shared ({ caller }) func addOrUpdateProduct(product : Product) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add or update products");
    };
    let userProducts = switch (products.get(caller)) {
      case (null) { Map.empty<Text, Product>() };
      case (?products) { products };
    };
    userProducts.add(product.productId, product);
    products.add(caller, userProducts);
  };

  public query ({ caller }) func getProducts() : async [Product] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view products");
    };
    let userProducts = getUserProducts(caller);
    userProducts.values().toArray().sort();
  };

  public query ({ caller }) func getLowStockProducts() : async [Product] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view low stock products");
    };
    let userProducts = getUserProducts(caller);
    userProducts.values().toArray().filter(func(p) { p.currentStock < 5 });
  };

  public shared ({ caller }) func deleteProduct(productId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete products");
    };
    let userProducts = switch (products.get(caller)) {
      case (null) { Map.empty<Text, Product>() };
      case (?p) { p };
    };
    userProducts.remove(productId);
    products.add(caller, userProducts);
  };

  // Sales Management
  public shared ({ caller }) func addSale(sale : Sale) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add sales");
    };
    let userSales = switch (sales.get(caller)) {
      case (null) { Map.empty<Text, Sale>() };
      case (?sales) { sales };
    };

    let saleWithCurrentDate = {
      sale with
      date = Time.now();
    };

    userSales.add(sale.saleId, saleWithCurrentDate);
    sales.add(caller, userSales);
  };

  public query ({ caller }) func getSales() : async [Sale] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sales");
    };
    let userSales = getUserSales(caller);
    userSales.values().toArray().sort();
  };

  public shared ({ caller }) func deleteSale(saleId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete sales");
    };
    let userSales = switch (sales.get(caller)) {
      case (null) { Map.empty<Text, Sale>() };
      case (?s) { s };
    };
    userSales.remove(saleId);
    sales.add(caller, userSales);
  };

  // Shift Management
  public shared ({ caller }) func addOrUpdateShift(shift : Shift) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add or update shifts");
    };
    let userShifts = switch (shifts.get(caller)) {
      case (null) { Map.empty<Text, Shift>() };
      case (?shifts) { shifts };
    };
    userShifts.add(shift.shiftId, shift);
    shifts.add(caller, userShifts);
  };

  public query ({ caller }) func getShifts() : async [Shift] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view shifts");
    };
    let userShifts = getUserShifts(caller);
    userShifts.values().toArray().sort();
  };

  public query ({ caller }) func getUpcomingShifts() : async [Shift] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view upcoming shifts");
    };
    let userShifts = getUserShifts(caller);
    let now = Time.now();
    userShifts.values().toArray().filter(func(s) { s.date > now });
  };

  public query ({ caller }) func getShiftHistory() : async [Shift] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view shift history");
    };
    let userShifts = getUserShifts(caller);
    let now = Time.now();
    userShifts.values().toArray().filter(func(s) { s.date <= now });
  };

  public shared ({ caller }) func deleteShift(shiftId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete shifts");
    };
    let userShifts = switch (shifts.get(caller)) {
      case (null) { Map.empty<Text, Shift>() };
      case (?s) { s };
    };
    userShifts.remove(shiftId);
    shifts.add(caller, userShifts);
  };

  // Voice Usage
  public shared ({ caller }) func incrementVoiceUsage() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can increment voice usage");
    };
    let currentDate = Int.abs(Time.now());
    let currentUsage = switch (voiceUsage.get(caller)) {
      case (null) {
        let newVoiceUsage : VoiceUsage = {
          date = currentDate;
          count = 0;
        };
        voiceUsage.add(caller, newVoiceUsage);
        newVoiceUsage;
      };
      case (?usage) {
        if (usage.date != currentDate) {
          let newVoiceUsage : VoiceUsage = {
            date = currentDate;
            count = 0;
          };
          voiceUsage.add(caller, newVoiceUsage);
          newVoiceUsage;
        } else {
          usage;
        };
      };
    };

    let newCount = currentUsage.count + 1;
    voiceUsage.add(
      caller,
      {
        currentUsage with
        count = newCount;
      },
    );
    newCount;
  };

  public query ({ caller }) func getVoiceUsage() : async VoiceUsage {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view voice usage");
    };
    switch (voiceUsage.get(caller)) {
      case (null) {
        {
          date = Int.abs(Time.now());
          count = 0;
        };
      };
      case (?usage) { usage };
    };
  };

  // Earnings
  public query ({ caller }) func getEarningsTotal() : async (Float, Nat) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view earnings total");
    };
    let userTrips = getUserTrips(caller);
    var totalAmount : Float = 0.0;
    for (trip in userTrips.values()) {
      totalAmount := totalAmount + trip.amount;
    };
    (totalAmount, userTrips.size());
  };

  // Expenses
  public shared ({ caller }) func addExpense(expense : ExpenseEntry) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add expenses");
    };
    let userExpenses = switch (expenses.get(caller)) {
      case (null) { Map.empty<Text, ExpenseEntry>() };
      case (?expenses) { expenses };
    };
    userExpenses.add(expense.expenseId, expense);
    expenses.add(caller, userExpenses);
  };

  public query ({ caller }) func getExpenses() : async [ExpenseEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    let userExpenses = getUserExpenses(caller);
    userExpenses.values().toArray();
  };

  public shared ({ caller }) func deleteExpense(expenseId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete expenses");
    };
    let userExpenses = switch (expenses.get(caller)) {
      case (null) { Map.empty<Text, ExpenseEntry>() };
      case (?expenses) { expenses };
    };
    userExpenses.remove(expenseId);
    expenses.add(caller, userExpenses);
  };

  // Goals
  public shared ({ caller }) func setEarningsGoal(goal : EarningsGoal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set goals");
    };
    goals.add(caller, goal);
  };

  public query ({ caller }) func getEarningsGoal() : async ?EarningsGoal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view earnings goals");
    };
    goals.get(caller);
  };

  // Fuel Profile
  public shared ({ caller }) func saveFuelProfile(fuelConsumptionRate : Float, vehicleName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save fuel profiles");
    };
    let currentProfile = switch (profiles.get(caller)) {
      case (null) {
        {
          displayName = "";
          currencyCode = "ZAR";
          subscriptionTier = 0;
          voiceEnabled = false;
          fuelConsumptionRate = fuelConsumptionRate;
          vehicleName = vehicleName;
        };
      };
      case (?profile) {
        {
          profile with
          fuelConsumptionRate = fuelConsumptionRate;
          vehicleName = vehicleName;
        };
      };
    };
    profiles.add(caller, currentProfile);
  };

  public query ({ caller }) func getFuelProfile() : async { fuelConsumptionRate : Float; vehicleName : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view fuel profiles");
    };
    switch (profiles.get(caller)) {
      case (null) {
        {
          fuelConsumptionRate = 0.0;
          vehicleName = "";
        };
      };
      case (?profile) {
        {
          fuelConsumptionRate = profile.fuelConsumptionRate;
          vehicleName = profile.vehicleName;
        };
      };
    };
  };

  public shared ({ caller }) func addFuelLog(fuelLog : FuelLog) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add fuel logs");
    };
    let userFuelLogs = switch (fuelLogs.get(caller)) {
      case (null) { Map.empty<Int, FuelLog>() };
      case (?fuelLogs) { fuelLogs };
    };
    userFuelLogs.add(fuelLog.date, fuelLog);
    fuelLogs.add(caller, userFuelLogs);
  };

  public query ({ caller }) func getFuelLogs() : async [FuelLog] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view fuel logs");
    };
    let userFuelLogs = getUserFuelLogs(caller);
    userFuelLogs.values().toArray();
  };

  // Custom Events
  public shared ({ caller }) func addCustomEvent(event : Event) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add events");
    };
    let userEvents = switch (events.get(caller)) {
      case (null) { Map.empty<Text, Event>() };
      case (?events) { events };
    };
    // Always force isUserCreated = true for backend-stored events
    let eventWithFlag = { event with isUserCreated = true };
    userEvents.add(eventWithFlag.eventId, eventWithFlag);
    events.add(caller, userEvents);
  };

  public query ({ caller }) func getCustomEvents() : async [Event] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view events");
    };
    let userEvents = switch (events.get(caller)) {
      case (null) { Map.empty<Text, Event>() };
      case (?events) { events };
    };
    userEvents.values().toArray().sort();
  };

  public shared ({ caller }) func deleteCustomEvent(eventId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete events");
    };
    let userEvents = switch (events.get(caller)) {
      case (null) { Map.empty<Text, Event>() };
      case (?events) { events };
    };
    userEvents.remove(eventId);
    events.add(caller, userEvents);
  };

  // ICP Staking Records
  public shared ({ caller }) func saveStakingRecord(record : StakingRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save staking records");
    };
    let userStakes = switch (stakingRecords.get(caller)) {
      case (null) { Map.empty<Text, StakingRecord>() };
      case (?s) { s };
    };
    let recordWithDate = {
      record with
      startDate = if (record.startDate == 0) { Time.now() } else { record.startDate };
    };
    userStakes.add(record.stakeId, recordWithDate);
    stakingRecords.add(caller, userStakes);
  };

  public query ({ caller }) func getStakingRecords() : async [StakingRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view staking records");
    };
    switch (stakingRecords.get(caller)) {
      case (null) { [] };
      case (?s) { s.values().toArray() };
    };
  };

  public shared ({ caller }) func deleteStakingRecord(stakeId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete staking records");
    };
    let userStakes = switch (stakingRecords.get(caller)) {
      case (null) { Map.empty<Text, StakingRecord>() };
      case (?s) { s };
    };
    userStakes.remove(stakeId);
    stakingRecords.add(caller, userStakes);
  };

  // ICP Price from CoinGecko
  public shared ({ caller }) func getICPPrice() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd&include_24hr_change=true";
    let httpRequest : IC.http_request_args = {
      url = url;
      max_response_bytes = ?10_000;
      headers = [
        { name = "Accept"; value = "application/json" },
        { name = "User-Agent"; value = "caffeine.ai/DriverMax" },
      ];
      body = null;
      method = #get;
      transform = ?{
        function = transform;
        context = Blob.fromArray([]);
      };
      is_replicated = ?false;
    };
    let httpResponse = await (with cycles = 50_000_000_000) IC.http_request(httpRequest);
    switch (httpResponse.body.decodeUtf8()) {
      case (null) { "{\"error\":\"decode failed\"}" };
      case (?text) { text };
    };
  };

  // ElevenLabs Voice Proxy (API key stored securely in backend)
  public shared ({ caller }) func setElevenLabsApiKey(key : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set the ElevenLabs API key");
    };
    elevenLabsApiKey := key;
  };

  public query ({ caller }) func isElevenLabsConfigured() : async Bool {
    elevenLabsApiKey != "";
  };

  public shared ({ caller }) func elevenLabsTextToSpeech(text : Text) : async Blob {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
    let profile = switch (profiles.get(caller)) {
      case (null) { Runtime.trap("Profile not found") };
      case (?p) { p };
    };
    if (profile.subscriptionTier < 2) {
      Runtime.trap("Unauthorized: Voice AI requires Pro (R800/mo) or Premium (R1,100/mo) subscription");
    };
    if (elevenLabsApiKey == "") {
      Runtime.trap("ElevenLabs is not configured yet");
    };

    let voiceId = "mJZEpDe9qAKz9yOOwCD8";
    let url = "https://api.elevenlabs.io/v1/text-to-speech/" # voiceId;
    let body = "{\"text\":\"" # text # "\",\"model_id\":\"eleven_monolingual_v1\",\"voice_settings\":{\"stability\":0.5,\"similarity_boost\":0.75}}";

    let httpRequest : IC.http_request_args = {
      url = url;
      max_response_bytes = ?500_000;
      headers = [
        { name = "Content-Type"; value = "application/json" },
        { name = "xi-api-key"; value = elevenLabsApiKey },
        { name = "User-Agent"; value = "caffeine.ai" },
      ];
      body = ?body.encodeUtf8();
      method = #post;
      transform = ?{
        function = transform;
        context = Blob.fromArray([]);
      };
      is_replicated = ?false;
    };

    let httpResponse = await (with cycles = 231_000_000_000) IC.http_request(httpRequest);
    httpResponse.body;
  };

  // Persistent Stripe configuration
  var stripeConfiguration : ?Stripe.StripeConfiguration = null;

  public query ({ caller }) func isStripeConfigured() : async Bool {
    stripeConfiguration != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfiguration := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfiguration) {
      case (null) { Runtime.trap("The Stripe module needs to be configured first") };
      case (?value) { value };
    };
  };

  // Stripe integration
  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };
};
