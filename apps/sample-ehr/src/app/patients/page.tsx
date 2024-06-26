"use client";
import { PatientSortOrder, duration } from "@bonfhir/core/r4b";
import { useFhirForm } from "@bonfhir/mantine/r4b";
import { useFhirSearchController } from "@bonfhir/next/r4b/client";
import { useFhirSearch } from "@bonfhir/query/r4b";
import {
  FhirInput,
  FhirPagination,
  FhirQueryLoader,
  FhirTable,
  FhirValue,
} from "@bonfhir/react/r4b";
import { Box, Button, Flex, Group, Paper, Stack } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

export default function Patients() {
  const form = useFhirForm({
    initialValues: {
      patientName: "",
      practitioner: "",
      managingOrganization: "",
    },
  });

  const searchController = useFhirSearchController<
    PatientSortOrder,
    {
      patientName: string | undefined;
      practitioner: string | undefined;
      managingOrganization: string | undefined;
    }
  >("patients", {
    pageSize: 15,
    defaultSearch: {
      patientName: undefined,
      practitioner: undefined,
      managingOrganization: undefined,
    },
    initialValues(_, search) {
      form.setValues({
        patientName: search?.patientName ?? "",
        practitioner: search?.practitioner ?? "",
        managingOrganization: search?.managingOrganization ?? "",
      });
    },
    defaultSort: "-_lastUpdated",
  });

  const patientsQuery = useFhirSearch(
    "Patient",
    (search) =>
      search
        .name(searchController.search?.patientName)
        .generalPractitioner(searchController.search?.practitioner)
        .organization(searchController.search?.managingOrganization)
        ._total("accurate")
        ._count(searchController.pageSize)
        ._sort(searchController.sort),
    searchController.pageUrl,
  );

  const handleReset = () => {
    form.reset();
    searchController.onSearch({
      patientName: "",
      practitioner: "",
      managingOrganization: "",
    });
  };

  return (
    <Paper>
      <Stack>
        <Box>
          <form onSubmit={form.onSubmit(searchController.onSearch)}>
            <Flex gap="md" align="flex-end" direction="row">
              <FhirInput
                type="string"
                label="Patient name"
                {...form.getInputProps("patientName")}
              />
              <FhirInput
                type="Reference"
                resourceType="Practitioner"
                label="Provider"
                style={{ width: "100%" }}
                search={(query) => (search) => search.name(query)}
                {...form.getInputProps("practitioner")}
              />
              <FhirInput
                type="Reference"
                resourceType="Organization"
                label="Clinic"
                style={{ width: "100%" }}
                search={(query) => (search) => search.name(query)}
                {...form.getInputProps("managingOrganization")}
              />
              <Group grow preventGrowOverflow={false} wrap="nowrap">
                <Button type="submit" leftSection={<IconSearch />}>
                  Search
                </Button>
                <Button onClick={handleReset}>Reset</Button>
              </Group>
            </Flex>
          </form>
        </Box>
        <Box>
          <FhirQueryLoader query={patientsQuery}>
            <FhirTable
              {...patientsQuery}
              {...searchController}
              onRowNavigate={(patient) => `/patients/${patient.id}`}
              columns={[
                {
                  key: "name",
                  title: "Patient name",
                  sortable: true,
                  render: (patient) => (
                    <FhirValue type="HumanName" value={patient.name} />
                  ),
                },
                {
                  key: "birthDate",
                  title: "Date of birth",
                  sortable: true,
                  render: (patient) => (
                    <>
                      <FhirValue
                        type="date"
                        value={patient.birthDate}
                        options={{
                          dateStyle: "medium",
                          decorator: `{} (${
                            duration.age(patient?.birthDate)?.value
                          }yo)`,
                        }}
                      />
                    </>
                  ),
                },
                {
                  key: "ssn",
                  title: "SSN",
                  render: (patient) => (
                    <FhirValue
                      type="Identifier"
                      value={patient.identifier}
                      options={{
                        max: 1,
                        systemFilterOrder: ["http://hl7.org/fhir/sid/us-ssn"],
                        style: "value",
                        default: "Unknown",
                      }}
                    />
                  ),
                },
                {
                  key: "practitioner",
                  title: "Provider",
                  render: (patient) => (
                    <FhirValue
                      type="string"
                      value={patient.generalPractitioner?.[0]?.display}
                    />
                  ),
                },
                {
                  key: "clinic",
                  title: "Clinic",
                  render: (patient) => (
                    <FhirValue
                      type="string"
                      value={patient.managingOrganization?.display}
                    />
                  ),
                },
                {
                  key: "_lastUpdated",
                  title: "Last Updated",
                  sortable: true,
                  render: (patient) => (
                    <FhirValue
                      type="instant"
                      value={patient.meta.lastUpdated}
                      options={{ dateStyle: "relative" }}
                    />
                  ),
                },
              ]}
            />
            <FhirPagination {...patientsQuery} {...searchController} />
          </FhirQueryLoader>
        </Box>
      </Stack>
    </Paper>
  );
}
