/*!
 * @license
 * Copyright 2019 Alfresco, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DialogService } from '@alfresco-dbp/adf-candidates/core/dialog';
import { Location } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { distinctUntilChanged, distinctUntilKeyChanged, filter, map, switchMap, take, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { MODEL_TYPE } from '../../api/types';
import { ModelEditorComponent } from '../../model-editor/components/model-editor/model-editor.component';
import { CanComponentDeactivate } from '../../model-editor/router/guards/unsaved-page.guard';
import { TabModel } from '../../models/tab.model';
import { TabManagerService } from '../../services/tab-manager.service';
import { selectAppDirtyState } from '../../store/app.selectors';
import { AmaState } from '../../store/app.state';
import { selectModelEntityByType } from '../../store/model-entity.selectors';
import { ModelOpenedAction } from '../../store/project.actions';
import { TabManagerEntityService } from './tab-manager-entity.service';
@Component({
    selector: 'modelingsdk-tab-manager',
    templateUrl: './tab-manager.component.html',
    styleUrls: ['./tab-manager.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: { 'class': 'modelingsdk-tab-manager' }
})
export class TabManagerComponent implements OnInit, CanComponentDeactivate {

    modelId$: Observable<string>;
    modelEntity$: Observable<MODEL_TYPE>;
    modelIcon$: Observable<string>;
    selectedTabIndex$: Observable<number>;
    isDirtyState = false;
    currentActiveTab: TabModel = null;
    selectedTabIndex = -1;

    @ViewChild('modelEditor')
    private modelEditor: ModelEditorComponent;
    currentTabs$: Observable<TabModel[]> | Store<TabModel[]>;
    openedTabs: TabModel[] = [];
    currentActiveTab$: Observable<[TabModel, TabModel[]]>;

    constructor(private activatedRoute: ActivatedRoute,
        private tabManagerService: TabManagerService,
        private location: Location,
        private store: Store<AmaState>,
        private dialogService: DialogService,
        private router: Router,
        private tabManagerEntityService: TabManagerEntityService) {

        this.currentTabs$ = this.tabManagerEntityService.entities$.pipe(
            tap(entities => this.openedTabs = entities),
            takeUntil(this.tabManagerService.resetTabs$)
        );

        this.currentActiveTab$ = this.tabManagerService.getActiveTab();
    }

    public ngOnInit(): void {
        this.modelId$ = this.activatedRoute.params.pipe(map((params) => params.modelId)).pipe(distinctUntilChanged());
        this.modelEntity$ = this.activatedRoute.data.pipe(map((data) => data.modelEntity)).pipe(take(1));
        this.modelIcon$ = this.activatedRoute.data.pipe(map((data) => data.entityIcon)).pipe(take(1));

        this.currentActiveTab$.pipe(takeUntil(this.tabManagerService.resetTabs$))
            .subscribe(([tab, currentTabs]) => {
                this.currentActiveTab = tab;
                this.selectedTabIndex = currentTabs.findIndex((indexTab) => indexTab.id === tab.id);
            });

        this.modelId$.pipe(
            withLatestFrom(this.currentTabs$, this.modelEntity$, this.modelIcon$),
            switchMap(([modelId, openedTabs, entityType, modelIcon]) => {
                const existingTab = openedTabs.find((tab: { id: any; }) => tab.id === modelId);
                if (existingTab) {
                    return of(existingTab);
                } else {
                    return this.createNewTab(modelId, entityType, modelIcon);
                }
            }),
            takeUntil(this.tabManagerService.resetTabs$)
        ).subscribe((tab: TabModel) => this.tabManagerService.openTab(tab, this.currentActiveTab));

        this.store.select(selectAppDirtyState)
            .pipe(takeUntil(this.tabManagerService.resetTabs$))
            .subscribe((isDirtyState) => this.isDirtyState = isDirtyState);
    }

    canDeactivate(): Observable<boolean> {
        return this.modelEditor.canDeactivate();
    }

    onRemoveTab(tab: TabModel) {
        if (this.isDirtyState) {
            this.dialogService.confirm({
                title: 'SDK.MODEL_EDITOR.CONFiRM.TITLE',
                messages: ['SDK.MODEL_EDITOR.CONFiRM.MESSAGE']
            })
                .subscribe((choice) => {
                    if (choice) {
                        this.removeTab(tab);
                    }
                });
        } else {
            this.removeTab(tab);
        }
    }

    private removeTab(tab: TabModel) {
        this.tabManagerService.removeTab(tab, this.openedTabs);
        if (this.openedTabs.length === 0) {
            this.resetToProjectUrl();
        }
    }

    private resetToProjectUrl() {
        const projectUrl = this.buildNextUrl();
        void this.router.navigate([projectUrl], { relativeTo: this.activatedRoute });
        this.tabManagerService.reset();
    }

    private createNewTab(modelId: string, entityType: MODEL_TYPE, modelIcon: string) {
        return this.store.select(selectModelEntityByType(entityType, modelId)).pipe(
            filter((model) => !!model),
            map((model) => new TabModel(model.name, modelIcon, model.id, model.type.toLocaleLowerCase(), true)),
            distinctUntilKeyChanged('id'),
            tap((tab: TabModel) => this.tabManagerEntityService.addOneToCache(tab)),
            takeUntil(this.tabManagerService.resetTabs$)
        );
    }

    onSelectedTabChanged(tabIndex: number) {
        const currentTab: TabModel = this.openedTabs[tabIndex];
        if (currentTab) {
            this.store.dispatch(new ModelOpenedAction({ id: currentTab.id, type: currentTab.modelType }));
            const nextUrl = this.buildNextUrl(currentTab.modelType, currentTab.id);
            this.location.replaceState(nextUrl);
        }
    }

    private buildNextUrl(modelType?: string, modelId?: string): string {
        const splitUrl = this.location.path().split('/');
        splitUrl.splice(splitUrl.length - 2, 2);
        const addOnPieces = [];
        if (modelType) {
            addOnPieces.push(modelType);
        }
        if (modelId) {
            addOnPieces.push(modelId);
        }
        const reworkedUrl = addOnPieces.length > 0 ? splitUrl.concat(addOnPieces).join('/') : splitUrl.join('/');
        return reworkedUrl;
    }

}
