package planningpoker.gitlab;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.LongStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import planningpoker.gitlab.GitLabException.Reason;
import planningpoker.session.TestClock;

class DemoGitLabTest {

    private static final Instant START = Instant.parse("2026-11-27T10:00:00Z");
    private static final String WEBSHOP = "101";
    private static final String MOBILE_APP = "102";
    private static final int WEBSHOP_ISSUES = 22;

    private TestClock clock;
    private DemoGitLab demo;

    @BeforeEach
    void readDemoData() {
        clock = new TestClock(START);
        demo = new DemoGitLab(clock);
    }

    private static IssueQuery all(int page) {
        return new IssueQuery(null, null, null, page);
    }

    private static List<Long> iids(IssuePage page) {
        return page.items().stream().map(GitLabIssue::iid).toList();
    }

    @Test
    void hasTwoProjectsWithLinksThatLeadNowhere() {
        ProjectPage page = demo.searchProjects(null, 1);

        assertEquals(
                List.of("Webshop", "Mobile App"),
                page.items().stream().map(GitLabProject::name).toList());
        assertEquals(Optional.empty(), page.nextPage());
        assertEquals(
                "https://gitlab.example.com/demo/webshop", page.items().get(0).webUrl());
        assertEquals(
                "https://gitlab.example.com/demo/webshop/-/issues/3",
                demo.loadIssue(WEBSHOP, 3).webUrl());
    }

    @ParameterizedTest(name = "search {0} finds {1}")
    @CsvSource({"WEB, Webshop", "shop, Webshop", "mobile, Mobile App", "' App ', Mobile App"})
    void searchesProjectsByNameWithoutCase(String search, String name) {
        assertEquals(
                List.of(name),
                demo.searchProjects(search, 1).items().stream()
                        .map(GitLabProject::name)
                        .toList());
    }

    @Test
    void findsNoProjectForAnotherNameAndNoneOnPageTwo() {
        assertEquals(List.of(), demo.searchProjects("kein Treffer", 1).items());
        assertEquals(List.of(), demo.searchProjects(null, 2).items());
    }

    @Test
    void loadsAProjectByIdAndByPath() {
        assertEquals("Webshop", demo.loadProject(WEBSHOP).name());
        assertEquals(102, demo.loadProject("demo/mobile-app").id());
    }

    @Test
    void searchesIssuesByAPartOfTheTitleWithoutCase() {
        IssuePage page = demo.searchIssues(WEBSHOP, new IssueQuery("WARENKORB", null, null, 1));

        assertEquals(List.of(1L, 15L), iids(page));
        assertEquals(Optional.of(2), page.total());
        assertEquals(Optional.empty(), page.nextPage());
    }

    @ParameterizedTest(name = "weight {0}: {1} issues")
    @CsvSource({"None, 3", "Any, 3", ", 6"})
    void filtersIssuesByWeight(String weight, int count) {
        IssuePage page = demo.searchIssues(MOBILE_APP, new IssueQuery(null, weight, null, 1));

        assertEquals(Optional.of(count), page.total());
        boolean withWeight = "Any".equals(weight);
        if (weight != null) {
            assertTrue(page.items().stream().allMatch(issue -> (issue.weight() != null) == withWeight));
        }
    }

    @ParameterizedTest(name = "changed in the last {0} days: {1} issues")
    @CsvSource({"7, 5", "30, 11", "365, 20", "1000, 22"})
    void filtersIssuesByTheTimeOfTheLastChange(int days, int count) {
        Instant updatedAfter = clock.instant().minus(Duration.ofDays(days));

        IssuePage page = demo.searchIssues(WEBSHOP, new IssueQuery(null, null, updatedAfter, 1));

        assertEquals(Optional.of(count), page.total());
    }

    @Test
    void keepsAnIssueChangedExactlyAtTheLimit() {
        Instant changedAt = START.minus(Duration.ofHours(3));

        assertEquals(List.of(1L), iids(demo.searchIssues(WEBSHOP, new IssueQuery(null, null, changedAt, 1))));
        assertEquals(
                List.of(), iids(demo.searchIssues(WEBSHOP, new IssueQuery(null, null, changedAt.plusSeconds(1), 1))));
    }

    @Test
    void sortsByTheLastChangeNewestFirstInPagesOfTwenty() {
        IssuePage first = demo.searchIssues(WEBSHOP, all(1));
        IssuePage second = demo.searchIssues(WEBSHOP, all(2));
        IssuePage third = demo.searchIssues(WEBSHOP, all(3));

        assertEquals(LongStream.rangeClosed(1, 20).boxed().toList(), iids(first));
        assertEquals(Optional.of(2), first.nextPage());
        assertEquals(Optional.of(WEBSHOP_ISSUES), first.total());
        assertEquals(List.of(21L, 22L), iids(second));
        assertEquals(Optional.empty(), second.nextPage());
        assertEquals(Optional.of(WEBSHOP_ISSUES), second.total());
        assertEquals(List.of(), iids(third));
        assertEquals(Optional.empty(), third.nextPage());
    }

    @Test
    void writesTheWeightAndMovesTheIssueToTheTop() {
        clock.advance(Duration.ofMinutes(5));

        demo.setWeight(WEBSHOP, 22, 13);

        assertEquals(13, demo.loadIssue(WEBSHOP, 22).weight());
        assertEquals(22L, iids(demo.searchIssues(WEBSHOP, all(1))).get(0));
        assertTrue(iids(demo.searchIssues(WEBSHOP, new IssueQuery(null, "Any", null, 1)))
                .contains(22L));
        assertEquals(List.of(), iids(demo.searchIssues(WEBSHOP, new IssueQuery("archivieren", "None", null, 1))));
        assertEquals(List.of(22L), iids(demo.searchIssues(WEBSHOP, new IssueQuery(null, null, clock.instant(), 1))));
    }

    @Test
    void keepsTheCommentsOfAnIssueInOrder() {
        demo.addNote(MOBILE_APP, 4, "first");
        demo.addNote(MOBILE_APP, 4, "second");

        assertEquals(List.of("first", "second"), demo.notes(MOBILE_APP, 4));
        assertEquals(List.of(), demo.notes(MOBILE_APP, 5));
        assertEquals(4L, iids(demo.searchIssues(MOBILE_APP, all(1))).get(0));
    }

    @Test
    void startsEveryInstanceFromTheSameData() {
        demo.setWeight(MOBILE_APP, 2, 8);

        assertEquals(null, new DemoGitLab(clock).loadIssue(MOBILE_APP, 2).weight());
    }

    @Test
    void reportsAnUnknownProjectAsNotFound() {
        assertNotFound(() -> demo.loadProject("999"));
        assertNotFound(() -> demo.searchIssues("999", all(1)));
        assertNotFound(() -> demo.loadIssue("999", 1));
    }

    @Test
    void reportsAnUnknownIssueAsNotFound() {
        assertNotFound(() -> demo.loadIssue(WEBSHOP, 999));
        assertNotFound(() -> demo.addNote(WEBSHOP, 999, "text"));
        assertNotFound(() -> demo.setWeight(WEBSHOP, 999, 5));
    }

    private static void assertNotFound(Runnable call) {
        GitLabException e = assertThrows(GitLabException.class, call::run);
        assertEquals(Reason.NOT_FOUND, e.reason());
        assertEquals(404, e.status());
    }
}
