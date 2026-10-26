targetScope = 'resourceGroup'

@description('Azure region for the UREfy AI pilot.')
param location string = 'westeurope'

@description('Subscription owner notification address for the monthly resource-group budget.')
param budgetEmail string = 'razvan@urefy.com'

@secure()
@minLength(24)
param pgAdminPassword string

@secure()
@minLength(32)
param sharedToken string

var suffix = uniqueString(subscription().id, resourceGroup().id)
var registryName = 'urefyai${take(suffix, 10)}'
var storageName = 'urefyblob${take(suffix, 10)}'
var pgName = 'urefy-pg-${take(suffix, 10)}'
var appName = 'urefy-ai-${take(suffix, 10)}'
var planName = 'urefy-ai-plan'
var pgAdmin = 'urefyadmin'
var pgDatabase = 'urefy_ai'
var deploymentName = 'gpt-4.1-mini'
var openAiApiVersion = '2024-10-21'
var blobContainer = 'summaries'
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var blobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var openAiUserRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
  tags: { application: 'UREfy', environment: 'ai-pilot', costCenter: 'startup-credit-milestone' }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
  tags: { application: 'UREfy', environment: 'ai-pilot', costCenter: 'startup-credit-milestone' }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    deleteRetentionPolicy: { enabled: true, days: 7 }
    containerDeleteRetentionPolicy: { enabled: true, days: 7 }
  }
}

resource summaryContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: blobContainer
  properties: { publicAccess: 'None' }
}

resource summaryLifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          enabled: true
          name: 'expire-ai-summary-cache'
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: ['blockBlob'] }
            actions: { baseBlob: { delete: { daysAfterModificationGreaterThan: 30 } } }
          }
        }
      ]
    }
  }
}

resource openAi 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: 'urefy-foundry-${take(suffix, 10)}'
  location: location
  kind: 'OpenAI'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: 'urefy-foundry-${take(suffix, 10)}'
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
  }
  tags: { application: 'UREfy', environment: 'ai-pilot', costCenter: 'startup-credit-milestone' }
}

resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openAi
  name: deploymentName
  sku: { name: 'GlobalStandard', capacity: 1 }
  properties: {
    model: { format: 'OpenAI', name: 'gpt-4.1-mini', version: '2025-04-14' }
    versionUpgradeOption: 'NoAutoUpgrade'
    raiPolicyName: 'Microsoft.Default'
  }
}

resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: pgName
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    administratorLogin: pgAdmin
    administratorLoginPassword: pgAdminPassword
    version: '16'
    createMode: 'Default'
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: { mode: 'Disabled' }
  }
  tags: { application: 'UREfy', environment: 'ai-pilot', costCenter: 'startup-credit-milestone' }
}

resource pgDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2022-12-01' = {
  parent: pg
  name: pgDatabase
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: { name: 'B1', tier: 'Basic', size: 'B1', capacity: 1 }
  properties: { reserved: true }
  tags: { application: 'UREfy', environment: 'ai-pilot', costCenter: 'startup-credit-milestone' }
}

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux,container'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${registry.properties.loginServer}/urefy-azure-ai-api:stable'
      acrUseManagedIdentityCreds: true
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        { name: 'WEBSITES_PORT', value: '8080' }
        { name: 'PORT', value: '8080' }
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
        { name: 'UREFY_AI_SHARED_TOKEN', value: sharedToken }
        { name: 'AZURE_OPENAI_ENDPOINT', value: openAi.properties.endpoint }
        { name: 'AZURE_OPENAI_DEPLOYMENT', value: deploymentName }
        { name: 'AZURE_OPENAI_API_VERSION', value: openAiApiVersion }
        { name: 'AZURE_SUMMARY_CONTAINER', value: blobContainer }
        { name: 'AZURE_STORAGE_BLOB_ENDPOINT', value: 'https://${storage.name}.blob.${environment().suffixes.storage}/' }
        { name: 'PGHOST', value: '${pg.name}.postgres.database.azure.com' }
        { name: 'PGPORT', value: '5432' }
        { name: 'PGDATABASE', value: pgDatabase }
        { name: 'PGUSER', value: pgAdmin }
        { name: 'PGPASSWORD', value: pgAdminPassword }
      ]
    }
  }
  dependsOn: [pgDb, summaryContainer, modelDeployment]
  tags: { application: 'UREfy', environment: 'ai-pilot', costCenter: 'startup-credit-milestone' }
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, app.id, acrPullRoleId)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource blobDataContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, app.id, blobDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributorRoleId)
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource openAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAi.id, app.id, openAiUserRoleId)
  scope: openAi
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', openAiUserRoleId)
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource monthlyBudget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: 'urefy-ai-pilot-monthly-50-usd'
  properties: {
    category: 'Cost'
    amount: 50
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: '2026-10-01T00:00:00Z'
      endDate: '2027-10-31T23:59:59Z'
    }
    notifications: {
      Actual_80_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        contactEmails: [budgetEmail]
      }
      Forecast_90_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 90
        contactEmails: [budgetEmail]
      }
      Actual_100_Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        contactEmails: [budgetEmail]
      }
    }
  }
}

output registryName string = registry.name
output registryLoginServer string = registry.properties.loginServer
output appName string = app.name
output appUrl string = 'https://${app.properties.defaultHostName}'
output postgresServerName string = pg.name
output postgresHost string = '${pg.name}.postgres.database.azure.com'
output storageName string = storage.name
output foundryName string = openAi.name
output foundryEndpoint string = openAi.properties.endpoint
