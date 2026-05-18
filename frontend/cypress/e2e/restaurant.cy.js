describe('Restaurant Reservation System - Full E2E Scenarios (Client & Staff)', () => {
  beforeEach(() => {
    // Przed każdym scenariuszem wchodzimy na stronę główną restauracji
    cy.visit('/');
  });

  it('Scenariusz 1: Klient rezerwuje stolik bezpośrednio z interaktywnego planu sali', () => {
    // 1. Weryfikacja strony głównej
    cy.contains('Witaj w naszym systemie rezerwacji online!').should('be.visible');
    
    // 2. Kliknięcie pierwszego wolnego stolika na planie sali
    cy.get('.table-element').first().should('be.visible').click();
    
    // Klasa .selected powinna zostać dodana do stolika
    cy.get('.table-element').first().should('have.class', 'selected');

    // Generujemy losową datę w przyszłości, aby testy nie wchodziły ze sobą w konflikt przy przeładowaniach
    const pad = (n) => n.toString().padStart(2, '0');
    const randomDay = Math.floor(Math.random() * 18) + 10; // Losowy dzień 10-27
    const randomMonth = Math.floor(Math.random() * 5) + 6;  // Losowy miesiąc 6-10
    const randomDate = `2027-${pad(randomMonth)}-${pad(randomDay)}`;
    const randomHour = Math.floor(Math.random() * 8) + 12;  // Losowa godzina 12-19
    const randomTime = `${pad(randomHour)}:30`;

    // 3. Wypełnienie formularza rezerwacji
    cy.get('input[name="firstName"]').type('Janusz');
    cy.get('input[name="lastName"]').type('Nosacz');
    cy.get('input[name="phone"]').type('505404303');
    cy.get('input[name="email"]').type('janusz@nosacz.pl');
    cy.get('input[name="date"]').type(randomDate);
    cy.get('input[name="time"]').type(randomTime);
    cy.get('input[name="guestCount"]').clear().type('2');
    cy.get('textarea[name="notes"]').type('Chcemy stolik blisko kelnera. Pozdrawiam.');

    // 4. Wysłanie formularza do bazy danych
    cy.get('.submit-btn').click();

    // 5. Weryfikacja ekranu sukcesu
    cy.contains('Rezerwacja złożona pomyślnie!').should('be.visible');
    cy.get('.confirmation-badge').should('be.visible').and('contain.text', '#R-');

    // 6. Kliknięcie guzika powrotu
    cy.contains('Złóż kolejną rezerwację').click();
    cy.contains('Witaj w naszym systemie rezerwacji online!').should('be.visible');
  });

  it('Scenariusz 2: Personel loguje się, a system wymusza właściwe role i uprawnienia (RBAC)', () => {
    // 1. Przejście do panelu pracownika
    cy.contains('Panel pracownika').click();
    cy.contains('Panel Pracownika').should('be.visible');

    // 2. Próba błędnego logowania
    cy.get('input[placeholder="np. admin lub kelner"]').type('wrong_user');
    cy.get('input[placeholder="np. admin123 lub kelner123"]').type('wrong_password');
    cy.get('button[type="submit"]').click();
    cy.contains('Nieprawidłowy login lub hasło').should('be.visible');

    // Czyszczenie pól logowania
    cy.get('input[placeholder="np. admin lub kelner"]').clear();
    cy.get('input[placeholder="np. admin123 lub kelner123"]').clear();

    // 3. Logowanie jako KELNER
    cy.get('input[placeholder="np. admin lub kelner"]').type('kelner');
    cy.get('input[placeholder="np. admin123 lub kelner123"]').type('kelner123');
    cy.get('button[type="submit"]').click();

    // Sprawdzenie powitania i badge roli kelnera
    cy.contains('Witaj, Jan! 👋').should('be.visible');
    cy.contains('rola: kelner').should('be.visible');

    // Upewnienie się, że kelner NIE WIDZI zakładek zarządczych
    cy.contains('📊 Analizy i Raporty').should('not.exist');
    cy.contains('🛠️ Projektant Sali').should('not.exist');
    cy.contains('👤 Pracownicy').should('not.exist');
    cy.contains('👥 Baza Gości').should('not.exist');

    // Wylogowanie kelnera
    cy.contains('Wyloguj się').click();
    cy.contains('Panel Pracownika').should('be.visible');

    // 4. Logowanie jako MANAGER
    cy.get('input[placeholder="np. admin lub kelner"]').type('admin');
    cy.get('input[placeholder="np. admin123 lub kelner123"]').type('admin123');
    cy.get('button[type="submit"]').click();

    // Sprawdzenie powitania i badge roli managera
    cy.contains('Witaj, Bartłomiej! 👋').should('be.visible');
    cy.contains('rola: manager').should('be.visible');

    // Upewnienie się, że manager WIDZI zakładki nawigacji
    cy.contains('📅 Rezerwacje').should('be.visible');
    cy.contains('📊 Analizy i Raporty').should('be.visible');
    cy.contains('🛠️ Projektant Sali').should('be.visible');
    cy.contains('👤 Pracownicy').should('be.visible');
    cy.contains('👥 Baza Gości').should('be.visible');

    // 5. Wejście do panelu raportów i analiz
    cy.contains('📊 Analizy i Raporty').click();
    cy.contains('Dashboard Analizy i Raportów (Manager)').should('be.visible');
    
    // Weryfikacja obecności statystyk bazy i wykresów
    cy.contains('Suma wszystkich rezerwacji w bazie').should('be.visible');
    cy.contains('🏆 Najaktywniejsi Klienci (TOP 10)').should('be.visible');
    cy.contains('📊 Popularność Stolików').should('be.visible');
    cy.contains('📈 Wydajność Miesięczna (Rok 2026)').should('be.visible');

    // Powrót do widoku rezerwacji i wylogowanie managera
    cy.contains('📅 Rezerwacje').click();
    cy.contains('Wyloguj się').click();
    cy.contains('Panel Pracownika').should('be.visible');
  });
});
